export type ContentSlot = "eyebrow" | "headline" | "subhead" | "body" | "primaryCta" | "secondaryCta";
export type ComponentKind = "page" | "section" | "text" | "button" | "card" | "heading" | "input" | "select" | "textarea" | "checkbox" | "radio" | "switch" | "badge" | "label" | "header-nav" | "side-nav" | "footer" | "modal-dialog" | "alert-banner" | "testimonial" | "faq" | "feature-grid" | "cta-section" | "app-shell";
export interface SchemaNode {
    id: string;
    kind: ComponentKind;
    children?: SchemaNode[];
}
export interface ContentModel {
    eyebrow?: string;
    headline?: string;
    subhead?: string;
    body?: string;
    primaryCta?: string;
    secondaryCta?: string;
}
export type { ToolkitProjectConfig } from "./toolkit-config.js";
export { DEFAULT_PROJECT_CONFIG, isToolkitProjectConfig } from "./toolkit-config.js";
export type { RendererDesignSystem, RendererComponentMapping, CanonicalComponentKind } from "./renderer-contract.js";
export { resolveDesignSystem } from "./design-system.js";
export * from "./taxonomy-registry.js";
export type { ComponentMatch } from "./public-api.js";
export { searchComponents, getPromptEnrichmentSegment } from "./public-api.js";
export type { DSMetadata, DSComponentMeta, DSTier } from "./ds-metadata.js";
export { DS_METADATA_REGISTRY, getDSMetadata } from "./ds-metadata.js";
//# sourceMappingURL=index.d.ts.map