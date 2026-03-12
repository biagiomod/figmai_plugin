import { getDefaultKbDocument, knowledgeBaseDocumentSchema } from './schemas';
function normalizeHeading(h) {
    const lower = h.toLowerCase().trim();
    if (/^#\s+.+/.test(h) && !h.startsWith('##'))
        return 'title';
    const rest = lower.replace(/^#+\s*/, '').trim();
    if (rest === 'purpose')
        return 'purpose';
    if (rest === 'scope')
        return 'scope';
    if (rest === 'definitions')
        return 'definitions';
    if (/^rules\s*(\&\s*constraints?)?$/.test(rest) || rest === 'rules & constraints') {
        return 'rulesConstraints';
    }
    if (rest === 'do')
        return 'do';
    if (rest === "don't" || rest === 'dont')
        return 'dont';
    if (rest === 'examples')
        return 'examples';
    if (rest === 'edge cases')
        return 'edgeCases';
    return 'unknown';
}
function extractListItems(block) {
    const items = [];
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\s*[-*]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
        if (m)
            items.push(m[1].trim());
        else if (line.trim())
            items.push(line.trim());
    }
    return items;
}
function extractFencedBlocks(block) {
    const blocks = [];
    const regex = /```[\s\S]*?```/g;
    let m;
    while ((m = regex.exec(block)) !== null) {
        const raw = m[0];
        const inner = raw.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();
        if (inner)
            blocks.push(inner);
    }
    return blocks;
}
export function parseMarkdown(md, id, titleOverride) {
    const doc = getDefaultKbDocument(id);
    if (titleOverride)
        doc.title = titleOverride;
    const sections = [];
    const re = /^(#{1,2})\s+(.+)$/gm;
    let lastEnd = 0;
    let lastLevel = 0;
    let lastName = '';
    let m;
    while ((m = re.exec(md)) !== null) {
        const fullMatch = m[0];
        const level = m[1].length;
        const name = m[2];
        const start = m.index;
        if (lastName) {
            sections.push({
                level: lastLevel,
                name: lastName,
                body: md.slice(lastEnd, start).trim()
            });
        }
        lastLevel = level;
        lastName = name;
        lastEnd = start + fullMatch.length;
    }
    if (lastName) {
        sections.push({
            level: lastLevel,
            name: lastName,
            body: md.slice(lastEnd).trim()
        });
    }
    for (const { level, name, body } of sections) {
        const key = normalizeHeading((level === 1 ? '#' : '##') + ' ' + name);
        if (key === 'title') {
            const t = body.split(/\n/)[0]?.trim() || name.trim();
            if (t && !doc.title)
                doc.title = t;
            continue;
        }
        if (key === 'purpose')
            doc.purpose = body.replace(/\n/g, ' ').trim();
        if (key === 'scope')
            doc.scope = body.replace(/\n/g, ' ').trim();
        if (key === 'definitions')
            doc.definitions = extractListItems(body);
        if (key === 'rulesConstraints')
            doc.rulesConstraints = extractListItems(body);
        if (key === 'do')
            doc.doDont.do = extractListItems(body);
        if (key === 'dont')
            doc.doDont.dont = extractListItems(body);
        if (key === 'examples') {
            const fenced = extractFencedBlocks(body);
            doc.examples = fenced.length > 0 ? fenced : extractListItems(body);
        }
        if (key === 'edgeCases')
            doc.edgeCases = extractListItems(body);
    }
    return knowledgeBaseDocumentSchema.parse(doc);
}
export function normalizeLooseJson(parsed, id, titleOverride) {
    const base = getDefaultKbDocument(id);
    if (titleOverride)
        base.title = titleOverride;
    const merged = { ...base, ...parsed, id };
    if (parsed.title !== undefined)
        merged.title = String(parsed.title);
    return knowledgeBaseDocumentSchema.parse(merged);
}
