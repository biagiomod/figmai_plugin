import type { ComponentKind } from "./index.js";
export type CanonicalComponentKind = ComponentKind;
export interface RendererComponentMapping {
    canonicalKind: CanonicalComponentKind;
    componentName: string;
}
export interface RendererDesignSystem {
    name: string;
    theme: string;
    components: RendererComponentMapping[];
}
//# sourceMappingURL=renderer-contract.d.ts.map