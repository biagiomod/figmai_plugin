/**
 * Structured design system metadata — single source of truth for all four DSes.
 *
 * This module has ZERO external imports. That is intentional and load-bearing:
 * schema/dist must be self-contained when vendored by an external host.
 * Do NOT add imports from DS adapter packages here.
 *
 * Used by resolveDesignSystem(), searchComponents(), and getPromptEnrichmentSegment().
 */
export type DSTier = "casual" | "enterprise";
export interface DSComponentMeta {
    /** Canonical kind as defined in ComponentKind */
    canonicalKind: string;
    /** DS-specific component name (e.g. "JazzButton") */
    componentName: string;
    /** Short description of what this component does in this DS context */
    description: string;
}
export interface DSMetadata {
    /** Registry key — matches the string used in resolveDesignSystem() */
    id: string;
    /** Human-readable display name */
    displayName: string;
    tier: DSTier;
    defaultTheme: string;
    fontFamily: string;
    primaryColor: string;
    /** Default border radius */
    defaultRadius: string;
    /** One-line character/personality summary */
    character: string;
    /** Icon set used */
    iconSet: string;
    /**
     * All 24 component entries for this DS.
     * Each entry carries the canonicalKind → componentName mapping AND a description.
     * resolveDesignSystem() reads componentName; searchComponents() reads all three fields.
     */
    components: DSComponentMeta[];
}
export declare const DS_METADATA_REGISTRY: DSMetadata[];
/** Look up metadata by DS id. Returns undefined for unknown ids. */
export declare function getDSMetadata(designSystem: string): DSMetadata | undefined;
//# sourceMappingURL=ds-metadata.d.ts.map