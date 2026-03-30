'use strict';

/**
 * Skills service — CRUD for universal skills.
 * S3 paths (relative to figmai/ prefix):
 *   Registry:   draft/skills/registry.json
 *   Skill file: draft/skills/{id}.md
 */

const { getObjectText, putObjectText, deleteObject } = require('./storageService');
const { json, noContent, errorResponse, parseBody } = require('./responseUtils');

const SKILL_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_KINDS = ['system', 'behavior', 'rules', 'examples', 'format', 'context'];

// --- Registry helpers ---

async function readRegistry() {
  const raw = await getObjectText('draft/skills/registry.json');
  if (!raw) return { skills: [] };
  try { return JSON.parse(raw); } catch { return { skills: [] }; }
}

async function writeRegistry(registry) {
  await putObjectText(
    'draft/skills/registry.json',
    JSON.stringify(registry, null, 2) + '\n',
    'application/json'
  );
}

function upsertEntry(registry, entry) {
  const idx = registry.skills.findIndex((s) => s.id === entry.id);
  if (idx >= 0) registry.skills[idx] = entry;
  else registry.skills.push(entry);
}

// --- Frontmatter helpers ---

/**
 * Parse a skill .md file: returns { meta, body }.
 * meta: { id, title, kind, version }
 * body: markdown content below the frontmatter block
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    meta[key] = val;
  }
  return { meta, body: match[2].trimStart() };
}

function serializeFrontmatter(meta, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined && v !== null && v !== '') lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n') + (body || '');
}

// --- Route handler ---

async function handleSkills(method, path, body, requestId, origin) {
  const SKILLS_PREFIX = '/figma-admin/api/skills';

  // GET /api/skills — return registry
  if (method === 'GET' && path === SKILLS_PREFIX) {
    return json(200, await readRegistry(), origin);
  }

  // POST /api/skills — create skill
  if (method === 'POST' && path === SKILLS_PREFIX) {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const { id, title, kind, content } = payload;
    if (!id || !SKILL_ID_REGEX.test(id)) return errorResponse(400, 'id must be kebab-case (a-z0-9 and hyphens)', origin);
    if (!title || typeof title !== 'string') return errorResponse(400, 'title is required', origin);
    if (!kind || !VALID_KINDS.includes(kind)) return errorResponse(400, `kind must be one of: ${VALID_KINDS.join(', ')}`, origin);

    const registry = await readRegistry();
    if (registry.skills.some((s) => s.id === id)) return errorResponse(409, `Skill "${id}" already exists`, origin);

    const filePath = `${id}.md`;
    const fileText = serializeFrontmatter(
      { id, title, kind, version: '1.0' },
      content || `${title}\n`
    );
    await putObjectText(`draft/skills/${filePath}`, fileText, 'text/markdown');
    const entry = { id, title, kind, filePath };
    upsertEntry(registry, entry);
    await writeRegistry(registry);

    return json(201, entry, origin);
  }

  // Routes with :id
  const idMatch = path.match(new RegExp('^' + SKILLS_PREFIX + '/([^/]+)$'));
  if (!idMatch) return json(404, { error: 'Not found', path }, origin);
  const skillId = idMatch[1];

  // GET /api/skills/:id — return skill content + meta
  if (method === 'GET') {
    const registry = await readRegistry();
    const entry = registry.skills.find((s) => s.id === skillId);
    if (!entry) return errorResponse(404, `Skill "${skillId}" not found`, origin);
    const raw = await getObjectText(`draft/skills/${entry.filePath}`);
    if (!raw) return errorResponse(404, `Skill file for "${skillId}" not found`, origin);
    const { meta, body } = parseFrontmatter(raw);
    return json(200, { ...entry, content: body }, origin);
  }

  // PATCH /api/skills/:id — update title, kind, and/or content
  if (method === 'PATCH') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const registry = await readRegistry();
    const entry = registry.skills.find((s) => s.id === skillId);
    if (!entry) return errorResponse(404, `Skill "${skillId}" not found`, origin);

    if (payload.title !== undefined) entry.title = String(payload.title);
    if (payload.kind !== undefined) {
      if (!VALID_KINDS.includes(payload.kind)) return errorResponse(400, `kind must be one of: ${VALID_KINDS.join(', ')}`, origin);
      entry.kind = payload.kind;
    }

    const raw = await getObjectText(`draft/skills/${entry.filePath}`);
    const { body: existingBody } = raw ? parseFrontmatter(raw) : { body: '' };
    const newBody = payload.content !== undefined ? payload.content : existingBody;
    const newFile = serializeFrontmatter(
      { id: skillId, title: entry.title, kind: entry.kind, version: '1.0' },
      newBody
    );
    await putObjectText(`draft/skills/${entry.filePath}`, newFile, 'text/markdown');
    await writeRegistry(registry);

    return json(200, { ...entry, content: newBody }, origin);
  }

  // DELETE /api/skills/:id
  if (method === 'DELETE') {
    const registry = await readRegistry();
    const entry = registry.skills.find((s) => s.id === skillId);
    if (!entry) return errorResponse(404, `Skill "${skillId}" not found`, origin);

    // Block delete if the skill is in any assistant's required universalSkills
    // (This check is advisory — enforcement is at model save time.)
    // For now, delete unconditionally and let callers check before calling.
    await deleteObject(`draft/skills/${entry.filePath}`);
    registry.skills = registry.skills.filter((s) => s.id !== skillId);
    await writeRegistry(registry);
    return noContent(origin);
  }

  return json(405, { error: 'Method not allowed' }, origin);
}

module.exports = { handleSkills, readRegistry };
