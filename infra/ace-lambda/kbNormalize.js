'use strict';

/**
 * KB normalization — JavaScript port of shared/ace-config/kbNormalize.ts.
 * Converts markdown or loose JSON into a canonical KnowledgeBaseDocument.
 */

const { getDefaultKbDocument, knowledgeBaseDocumentSchema } = require('./validationService');

function normalizeHeading(h) {
  const lower = h.toLowerCase().trim();
  if (/^#\s+.+/.test(h) && !h.startsWith('##')) return 'title';
  const rest = lower.replace(/^#+\s*/, '').trim();
  if (rest === 'purpose') return 'purpose';
  if (rest === 'scope') return 'scope';
  if (rest === 'definitions') return 'definitions';
  if (/^rules\s*(\&\s*constraints?)?$/.test(rest) || rest === 'rules & constraints')
    return 'rulesConstraints';
  if (rest === "do's and don'ts" || rest === 'dos and donts') return 'unknown';
  if (rest === 'do') return 'do';
  if (rest === "don't" || rest === 'dont') return 'dont';
  if (rest === 'examples') return 'examples';
  if (rest === 'edge cases') return 'edgeCases';
  return 'unknown';
}

function extractListItems(block) {
  const items = [];
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
    if (m) items.push(m[1].trim());
    else if (line.trim()) items.push(line.trim());
  }
  return items;
}

function linesToArray(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*]\s+|\s*$/g, '').trim())
    .filter(Boolean);
}

function extractFencedBlocks(block) {
  const blocks = [];
  const regex = /```[\s\S]*?```/g;
  let m;
  while ((m = regex.exec(block)) !== null) {
    const inner = m[0]
      .replace(/^```\w*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    if (inner) blocks.push(inner);
  }
  return blocks;
}

/**
 * Parse markdown into a normalized KB document.
 */
function parseMarkdown(md, id, titleOverride) {
  const doc = getDefaultKbDocument(id);
  if (titleOverride) doc.title = titleOverride;

  const sections = [];
  const re = /^(#{1,2})\s+(.+)$/gm;
  let lastEnd = 0, lastLevel = 0, lastName = '';
  let m;

  while ((m = re.exec(md)) !== null) {
    const level = m[1].length;
    const name = m[2];
    const start = m.index;
    if (lastName) {
      const body = md.slice(lastEnd, start).replace(/^\s+|\s+$/g, '');
      sections.push({ level: lastLevel, name: lastName, body });
    }
    lastLevel = level;
    lastName = name;
    lastEnd = start + m[0].length;
  }
  if (lastName) {
    const body = md.slice(lastEnd).replace(/^\s+|\s+$/g, '');
    sections.push({ level: lastLevel, name: lastName, body });
  }

  if (sections.length === 0) {
    const firstLine = md.split(/\n/)[0]?.replace(/^#\s*/, '').trim() || '';
    if (firstLine && !titleOverride) doc.title = firstLine;
    return knowledgeBaseDocumentSchema.parse(doc);
  }

  const unknownBlocks = [];

  for (const { level, name, body } of sections) {
    const key = normalizeHeading((level === 1 ? '#' : '##') + ' ' + name);
    if (key === 'title') {
      if (!doc.title) doc.title = body.split(/\n/)[0]?.trim() || name.trim();
      continue;
    }
    if (key === 'purpose') { doc.purpose = body.replace(/\n/g, ' ').trim(); continue; }
    if (key === 'scope') { doc.scope = body.replace(/\n/g, ' ').trim(); continue; }
    if (key === 'definitions') {
      doc.definitions = extractListItems(body);
      if (!doc.definitions.length && body.trim()) doc.definitions = linesToArray(body);
      continue;
    }
    if (key === 'rulesConstraints') {
      doc.rulesConstraints = extractListItems(body);
      if (!doc.rulesConstraints.length && body.trim()) doc.rulesConstraints = linesToArray(body);
      continue;
    }
    if (key === 'do') { doc.doDont.do = extractListItems(body); continue; }
    if (key === 'dont') { doc.doDont.dont = extractListItems(body); continue; }
    if (key === 'examples') {
      const fenced = extractFencedBlocks(body);
      doc.examples = fenced.length > 0 ? fenced : extractListItems(body);
      if (!doc.examples.length && body.trim()) doc.examples = [body.trim()];
      continue;
    }
    if (key === 'edgeCases') {
      doc.edgeCases = extractListItems(body);
      if (!doc.edgeCases.length && body.trim()) doc.edgeCases = linesToArray(body);
      continue;
    }
    if (key === 'unknown' && body.trim()) {
      const doMatch = body.match(
        /\n\s*###\s+Do\s*\n([\s\S]*?)(?=\n\s*###\s+Don'?t\s*\n|\n\s*##\s|$)/i
      );
      const dontMatch = body.match(
        /\n\s*###\s+Don'?t\s*\n([\s\S]*?)(?=\n\s*###\s+Do\s*\n|\n\s*##\s|$)/i
      );
      if (doMatch) doc.doDont.do = extractListItems(doMatch[1]);
      if (dontMatch) doc.doDont.dont = extractListItems(dontMatch[1]);
      if (!doMatch && !dontMatch) unknownBlocks.push(body);
      continue;
    }
    if (body.trim()) unknownBlocks.push(body);
  }

  if (unknownBlocks.length > 0) doc.edgeCases = [...doc.edgeCases, ...unknownBlocks];
  return knowledgeBaseDocumentSchema.parse(doc);
}

/**
 * Overlay loose JSON object onto a default KB document and validate.
 */
function normalizeLooseJson(parsed, id, titleOverride) {
  const base = getDefaultKbDocument(id);
  if (titleOverride) base.title = titleOverride;
  const merged = { ...base, ...parsed, id };
  if (parsed.title !== undefined) merged.title = String(parsed.title);
  return knowledgeBaseDocumentSchema.parse(merged);
}

module.exports = { parseMarkdown, normalizeLooseJson };
