/**
 * Public API — stable exports for external consumers (e.g. FigmAI).
 *
 * Both functions derive exclusively from DS_METADATA_REGISTRY in ds-metadata.ts.
 * No external package imports — schema/dist is self-contained when vendored.
 */
/**
 * A matched component entry returned by searchComponents().
 * Compatible in shape with FigmAI's DSComponentMatch.
 */
export interface ComponentMatch {
    /** Canonical kind, e.g. "button", "card" */
    canonicalKind: string;
    /** DS-specific component name, e.g. "JazzButton" */
    componentName: string;
    /** Short description of the component in this DS context */
    description?: string;
    /** The design system this match belongs to */
    designSystem: string;
    /** The theme active for this result */
    theme: string;
}
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
export declare function searchComponents(query: string, designSystem: string, theme?: string): Promise<ComponentMatch[]>;
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
export declare function getPromptEnrichmentSegment(designSystem: string, theme?: string): string | undefined;
//# sourceMappingURL=public-api.d.ts.map