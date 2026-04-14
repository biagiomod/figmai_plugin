import { getDSMetadata } from "./ds-metadata.js";
/**
 * Resolve a RendererDesignSystem for the given DS id and theme.
 *
 * No external package imports — all component mapping data lives in
 * ds-metadata.ts, making schema/dist self-contained when vendored.
 *
 * @throws if designSystem is not a known id.
 */
export function resolveDesignSystem(designSystem, theme) {
    const meta = getDSMetadata(designSystem);
    if (meta === undefined) {
        throw new Error(`Unsupported design system: "${designSystem}". Supported: acme, orbit, nuxt-ui, jazz`);
    }
    return {
        name: meta.id,
        theme,
        components: meta.components.map(c => ({
            canonicalKind: c.canonicalKind,
            componentName: c.componentName,
        })),
    };
}
//# sourceMappingURL=design-system.js.map