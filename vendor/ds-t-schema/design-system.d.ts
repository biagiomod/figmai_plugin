import type { RendererDesignSystem } from "./renderer-contract.js";
/**
 * Resolve a RendererDesignSystem for the given DS id and theme.
 *
 * No external package imports — all component mapping data lives in
 * ds-metadata.ts, making schema/dist self-contained when vendored.
 *
 * @throws if designSystem is not a known id.
 */
export declare function resolveDesignSystem(designSystem: string, theme: string): RendererDesignSystem;
//# sourceMappingURL=design-system.d.ts.map