/**
 * Public API — stable exports for external consumers (e.g. FigmAI).
 *
 * Both functions derive exclusively from DS_METADATA_REGISTRY in ds-metadata.ts.
 * No external package imports — schema/dist is self-contained when vendored.
 */
import { getDSMetadata } from "./ds-metadata.js";
// ── searchComponents ──────────────────────────────────────────────────────────
/**
 * Search components within a design system by query string.
 *
 * Matching is DS-scoped and deterministic — no fuzzy scoring or embeddings.
 * A component is included if the query (lowercased) appears in:
 *   - canonicalKind (e.g. "button")
 *   - componentName (e.g. "JazzButton")
 *   - description (e.g. "Interactive CTA button")
 *
 * Results are sorted: exact canonicalKind match first, then componentName
 * prefix matches, then description matches.
 *
 * @param query - Search string (case-insensitive)
 * @param designSystem - DS registry id, e.g. "acme", "jazz"
 * @param theme - Optional theme override. Defaults to the DS default theme.
 * @returns Sorted array of ComponentMatch. Empty array if no matches or unknown DS.
 */
export async function searchComponents(query, designSystem, theme) {
    const meta = getDSMetadata(designSystem);
    if (meta === undefined) {
        return [];
    }
    const resolvedTheme = theme ?? meta.defaultTheme;
    const q = query.toLowerCase().trim();
    if (q === "") {
        return [];
    }
    const results = [];
    for (const { canonicalKind, componentName, description } of meta.components) {
        // Score: higher = more relevant
        let score = 0;
        if (canonicalKind === q) {
            score = 100;
        }
        else if (componentName.toLowerCase() === q) {
            score = 90;
        }
        else if (canonicalKind.includes(q)) {
            score = 70;
        }
        else if (componentName.toLowerCase().includes(q)) {
            score = 60;
        }
        else if (description !== undefined && description.toLowerCase().includes(q)) {
            score = 40;
        }
        if (score > 0) {
            results.push({
                canonicalKind,
                componentName,
                ...(description !== undefined && { description }),
                designSystem,
                theme: resolvedTheme,
                _score: score,
            });
        }
    }
    results.sort((a, b) => b._score - a._score);
    // Strip internal score field before returning
    return results.map(({ _score: _s, ...rest }) => rest);
}
// ── getPromptEnrichmentSegment ────────────────────────────────────────────────
/**
 * Returns a concise, structured text block describing the active design system
 * for injection into LLM system prompts.
 *
 * The block is derived entirely from DS_METADATA_REGISTRY — not from SKILL.md
 * or any prose documentation. This keeps it deterministic and easy to update.
 *
 * Returns undefined if the design system id is not recognised.
 *
 * @param designSystem - DS registry id, e.g. "acme", "jazz"
 * @param theme - Optional theme override. Defaults to the DS default theme.
 */
export function getPromptEnrichmentSegment(designSystem, theme) {
    const meta = getDSMetadata(designSystem);
    if (meta === undefined) {
        return undefined;
    }
    const resolvedTheme = theme ?? meta.defaultTheme;
    const componentNames = meta.components.map(c => c.componentName);
    const lines = [
        `Design system: ${meta.displayName} (${meta.tier}, ${resolvedTheme})`,
        `Font: ${meta.fontFamily}`,
        `Primary color: ${meta.primaryColor}`,
        `Border radius: ${meta.defaultRadius}`,
        `Icons: ${meta.iconSet}`,
        `Character: ${meta.character}`,
    ];
    if (componentNames.length > 0) {
        lines.push(`Components: ${componentNames.join(", ")}`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=public-api.js.map