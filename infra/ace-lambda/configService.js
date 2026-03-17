'use strict';

/**
 * Config service — GET model, POST validate, POST save, POST publish.
 * S3-backed, revision-locked. Mirrors infra/config-api/src/routes/model.ts
 * and infra/config-api/src/routes/publish.ts but in plain JavaScript.
 */

const { getObjectText, putObjectText, listRelativeKeys, copyObject } = require('./storageService');
const { validateModel, saveRequestBodySchema } = require('./validationService');
const { json, errorResponse, parseBody } = require('./responseUtils');

function nowIso() {
  return new Date().toISOString();
}

function parseJsonOrDefault(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function ensureTrailingNewline(s) {
  return s.endsWith('\n') ? s : s + '\n';
}

async function getDraftMeta() {
  const raw = await getObjectText('draft/_meta.json');
  const parsed = parseJsonOrDefault(raw, {});
  const version = Number.isFinite(Number(parsed.version)) ? Number(parsed.version) : 0;
  return { version, lastModified: parsed.lastModified, lastAuthor: parsed.lastAuthor };
}

// --- GET /api/model ---

async function getModel(origin) {
  const [configRaw, manifestRaw, contentModelsRaw] = await Promise.all([
    getObjectText('draft/config.json'),
    getObjectText('draft/assistants.manifest.json'),
    getObjectText('draft/content-models.md'),
  ]);

  const knowledgeKeys = await listRelativeKeys('draft/knowledge/');
  const customKnowledge = {};
  for (const key of knowledgeKeys) {
    if (!key.endsWith('.md')) continue;
    const assistantId = key.replace(/^draft\/knowledge\//, '').replace(/\.md$/, '');
    customKnowledge[assistantId] = (await getObjectText(key)) || '';
  }

  const dsKeys = await listRelativeKeys('draft/design-systems/');
  const designSystemRegistries = {};
  for (const key of dsKeys) {
    if (!key.endsWith('/registry.json')) continue;
    const registryId = key
      .replace(/^draft\/design-systems\//, '')
      .replace(/\/registry\.json$/, '');
    const raw = await getObjectText(key);
    if (!raw) continue;
    try { designSystemRegistries[registryId] = JSON.parse(raw); } catch {}
  }

  const model = {
    config: parseJsonOrDefault(configRaw, {}),
    assistantsManifest: parseJsonOrDefault(manifestRaw, { assistants: [] }),
    customKnowledge,
    contentModelsRaw: contentModelsRaw || undefined,
    designSystemRegistries:
      Object.keys(designSystemRegistries).length > 0 ? designSystemRegistries : undefined,
  };

  const validation = validateModel(model);
  const [meta, publishedRaw] = await Promise.all([
    getDraftMeta(),
    getObjectText('published.json'),
  ]);

  let lastPublishedRevision = null;
  if (publishedRaw) {
    try {
      const n = Number(JSON.parse(publishedRaw).publishedRevision);
      if (Number.isFinite(n)) lastPublishedRevision = n;
    } catch {}
  }

  return json(200, {
    model,
    meta: {
      revision: String(meta.version),
      capabilities: {
        hasUnpublished: lastPublishedRevision === null || meta.version > lastPublishedRevision,
        canPublish: true,
      },
    },
    validation,
  }, origin);
}

// --- POST /api/validate ---

async function validate(body, origin) {
  let payload;
  try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }
  return json(200, validateModel(payload), origin);
}

// --- POST /api/save ---

async function saveModel(body, requestId, origin) {
  let raw;
  try { raw = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

  const parsedBody = saveRequestBodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return json(400, {
      errors: parsedBody.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      success: false,
    }, origin);
  }

  const request = parsedBody.data;
  const currentMeta = await getDraftMeta();
  const currentRevision = String(currentMeta.version);

  if (request.meta.revision !== currentRevision) {
    const publishedRaw = await getObjectText('published.json');
    let lastPublishedRevision = null;
    if (publishedRaw) {
      try { lastPublishedRevision = JSON.parse(publishedRaw).publishedRevision || null; } catch {}
    }
    return json(409, {
      error: 'STALE_REVISION',
      message: 'Files changed on disk. Reload to get the latest.',
      expectedRevision: request.meta.revision,
      currentRevision,
      lastPublishedRevision,
      meta: { revision: currentRevision },
    }, origin);
  }

  const semanticValidation = validateModel(request.model);
  if (semanticValidation.errors.length > 0) {
    return json(400, { errors: semanticValidation.errors, warnings: semanticValidation.warnings }, origin);
  }

  const filesWritten = [];
  const model = request.model;

  await putObjectText(
    'draft/config.json',
    JSON.stringify(model.config || {}, null, 2) + '\n',
    'application/json'
  );
  filesWritten.push('config.json');

  await putObjectText(
    'draft/assistants.manifest.json',
    JSON.stringify(model.assistantsManifest || { assistants: [] }, null, 2) + '\n',
    'application/json'
  );
  filesWritten.push('assistants.manifest.json');

  for (const [assistantId, markdown] of Object.entries(model.customKnowledge || {})) {
    await putObjectText(
      `draft/knowledge/${assistantId}.md`,
      ensureTrailingNewline(markdown),
      'text/markdown'
    );
    filesWritten.push(`knowledge/${assistantId}.md`);
  }

  if (typeof model.contentModelsRaw === 'string') {
    await putObjectText(
      'draft/content-models.md',
      ensureTrailingNewline(model.contentModelsRaw),
      'text/markdown'
    );
    filesWritten.push('content-models.md');
  }

  if (model.designSystemRegistries && typeof model.designSystemRegistries === 'object') {
    for (const [registryId, registry] of Object.entries(model.designSystemRegistries)) {
      await putObjectText(
        `draft/design-systems/${registryId}/registry.json`,
        JSON.stringify(registry || {}, null, 2) + '\n',
        'application/json'
      );
      filesWritten.push(`design-systems/${registryId}/registry.json`);
    }
  }

  const nextVersion = currentMeta.version + 1;
  await putObjectText(
    'draft/_meta.json',
    JSON.stringify({ version: nextVersion, lastModified: nowIso(), lastAuthor: 'api-user' }, null, 2) + '\n',
    'application/json'
  );

  console.log(JSON.stringify({
    type: 'action', action: 'save', requestId,
    filesWrittenCount: filesWritten.length,
    revisionFrom: currentRevision,
    revisionTo: String(nextVersion),
  }));

  return json(200, {
    success: true,
    meta: { revision: String(nextVersion) },
    filesWritten,
    generatorsRun: [],
  }, origin);
}

// --- POST /api/publish ---

async function publishModel(requestId, origin) {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const rand = Math.random().toString(36).slice(2, 6);
  const snapshotId = `${ts}_${rand}`;

  const meta = await getDraftMeta();
  const draftKeys = await listRelativeKeys('draft/');
  const copiedFiles = [];

  for (const key of draftKeys) {
    const relative = key.replace(/^draft\//, '');
    if (relative === '_meta.json') continue;
    await copyObject(key, `snapshots/${snapshotId}/${relative}`);
    copiedFiles.push(relative);
  }

  const createdAt = nowIso();
  await putObjectText(
    `snapshots/${snapshotId}/_manifest.json`,
    JSON.stringify({
      snapshotId, createdAt, author: 'api-user',
      draftVersion: meta.version, fileCount: copiedFiles.length,
    }, null, 2) + '\n',
    'application/json'
  );

  const publishedJson = {
    snapshotId,
    publishedRevision: String(meta.version),
    publishedAt: createdAt,
    snapshotPath: `snapshots/${snapshotId}/`,
    snapshotKey: `snapshots/${snapshotId}`,
  };
  await Promise.all([
    putObjectText(
      `snapshots/${snapshotId}/published.json`,
      JSON.stringify(publishedJson, null, 2) + '\n',
      'application/json'
    ),
    putObjectText(
      'published.json',
      JSON.stringify(publishedJson, null, 2) + '\n',
      'application/json'
    ),
  ]);

  console.log(JSON.stringify({
    type: 'action', action: 'publish', requestId,
    snapshotId, publishedRevision: meta.version,
  }));

  return json(200, { snapshotId, createdAt, publishedRevision: String(meta.version) }, origin);
}

module.exports = { getModel, validate, saveModel, publishModel };
