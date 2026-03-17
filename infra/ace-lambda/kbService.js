'use strict';

/**
 * KB service — full CRUD for knowledge-base documents + registry.
 * Mirrors infra/config-api/src/routes/kb.ts in plain JavaScript.
 */

const { z } = require('zod');
const { getObjectText, putObjectText, deleteObject } = require('./storageService');
const { knowledgeBaseDocumentSchema, KB_ID_REGEX } = require('./validationService');
const { parseMarkdown, normalizeLooseJson } = require('./kbNormalize');
const { json, noContent, errorResponse, parseBody } = require('./responseUtils');

const registryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  filePath: z.string(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  updatedAt: z.string().optional(),
});

const registrySchema = z.object({ knowledgeBases: z.array(registryEntrySchema) });

async function readRegistry() {
  const raw = await getObjectText('draft/knowledge-bases/registry.json');
  if (!raw) return { knowledgeBases: [] };
  try {
    const parsed = registrySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { knowledgeBases: [] };
  } catch {
    return { knowledgeBases: [] };
  }
}

async function writeRegistry(registry) {
  await putObjectText(
    'draft/knowledge-bases/registry.json',
    JSON.stringify(registry, null, 2) + '\n',
    'application/json'
  );
}

function upsertRegistryEntry(registry, entry) {
  const idx = registry.knowledgeBases.findIndex((e) => e.id === entry.id);
  if (idx >= 0) registry.knowledgeBases[idx] = entry;
  else registry.knowledgeBases.push(entry);
}

function formatZodErrors(err) {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
}

async function handleKb(method, path, body, requestId, origin) {
  // GET /api/kb/registry
  if (method === 'GET' && path === '/figma-admin/api/kb/registry') {
    return json(200, await readRegistry(), origin);
  }

  // POST /api/kb/normalize
  if (method === 'POST' && path === '/figma-admin/api/kb/normalize') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const { id, content, format, title } = payload;
    if (!id || !KB_ID_REGEX.test(id))
      return errorResponse(400, 'Invalid or missing KB id (must be kebab-case).', origin);

    try {
      let doc;
      if (format === 'markdown' || typeof content === 'string') {
        doc = parseMarkdown(content || '', id, title);
      } else {
        doc = normalizeLooseJson(typeof content === 'object' && content !== null ? content : payload, id, title);
      }
      return json(200, doc, origin);
    } catch (e) {
      return errorResponse(400, `Normalization failed: ${e.message}`, origin);
    }
  }

  // POST /api/kb — create
  if (method === 'POST' && path === '/figma-admin/api/kb') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const parsed = knowledgeBaseDocumentSchema.safeParse(payload);
    if (!parsed.success) return json(400, { errors: formatZodErrors(parsed.error) }, origin);

    const doc = parsed.data;
    const filePath = `knowledge-bases/${doc.id}.kb.json`;

    if (!payload.forceOverwrite) {
      const exists = await getObjectText(`draft/${filePath}`);
      if (exists)
        return json(409, { error: `KB '${doc.id}' already exists. Use forceOverwrite: true to replace.` }, origin);
    }

    await putObjectText(`draft/${filePath}`, JSON.stringify(doc, null, 2) + '\n', 'application/json');
    const registry = await readRegistry();
    upsertRegistryEntry(registry, {
      id: doc.id, title: doc.title, filePath,
      tags: doc.tags, version: doc.version, updatedAt: doc.updatedAt,
    });
    await writeRegistry(registry);
    console.log(JSON.stringify({ type: 'action', action: 'kb-create', requestId, id: doc.id }));
    return json(201, doc, origin);
  }

  // /:id routes
  const idMatch = path.match(/^\/figma-admin\/api\/kb\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (!KB_ID_REGEX.test(id))
      return errorResponse(400, 'Invalid KB id (must be kebab-case).', origin);
    const filePath = `knowledge-bases/${id}.kb.json`;

    // GET /api/kb/:id
    if (method === 'GET') {
      const raw = await getObjectText(`draft/${filePath}`);
      if (!raw) return errorResponse(404, `KB '${id}' not found.`, origin);
      try {
        const parsed = knowledgeBaseDocumentSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return json(422, { errors: formatZodErrors(parsed.error) }, origin);
        return json(200, parsed.data, origin);
      } catch {
        return errorResponse(500, 'Failed to parse KB document.', origin);
      }
    }

    // PATCH /api/kb/:id
    if (method === 'PATCH') {
      let payload;
      try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }
      if (payload.id && payload.id !== id)
        return errorResponse(400, 'id in body must match URL param.', origin);

      const existing = await getObjectText(`draft/${filePath}`);
      if (!existing) return errorResponse(404, `KB '${id}' not found.`, origin);

      let base;
      try { base = JSON.parse(existing); } catch { base = {}; }

      const parsed = knowledgeBaseDocumentSchema.safeParse({ ...base, ...payload, id });
      if (!parsed.success) return json(400, { errors: formatZodErrors(parsed.error) }, origin);

      const doc = parsed.data;
      await putObjectText(`draft/${filePath}`, JSON.stringify(doc, null, 2) + '\n', 'application/json');
      const registry = await readRegistry();
      upsertRegistryEntry(registry, {
        id: doc.id, title: doc.title, filePath,
        tags: doc.tags, version: doc.version, updatedAt: doc.updatedAt,
      });
      await writeRegistry(registry);
      console.log(JSON.stringify({ type: 'action', action: 'kb-update', requestId, id }));
      return json(200, doc, origin);
    }

    // DELETE /api/kb/:id
    if (method === 'DELETE') {
      const exists = await getObjectText(`draft/${filePath}`);
      if (!exists) return errorResponse(404, `KB '${id}' not found.`, origin);
      await deleteObject(`draft/${filePath}`);
      const registry = await readRegistry();
      registry.knowledgeBases = registry.knowledgeBases.filter((e) => e.id !== id);
      await writeRegistry(registry);
      console.log(JSON.stringify({ type: 'action', action: 'kb-delete', requestId, id }));
      return noContent(origin);
    }
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleKb };
