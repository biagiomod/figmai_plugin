import type { RendererDesignSystem } from "@design-system-toolkit/schema";
export interface FigmaRenderNode {
    id: string;
    kind: "page" | "section" | "text" | "button" | "card" | "heading" | "input" | "select" | "textarea" | "checkbox" | "radio" | "switch" | "badge" | "label" | "header-nav" | "side-nav" | "footer" | "modal-dialog" | "alert-banner" | "testimonial" | "faq" | "feature-grid" | "cta-section" | "app-shell";
    textContent?: string;
    children?: FigmaRenderNode[];
}
export interface FigmaLayerInstruction {
    id: string;
    type: "FRAME" | "TEXT" | "INSTANCE";
    name: string;
    textContent?: string;
    children?: FigmaLayerInstruction[];
}
export declare function createFigmaInstructionTree(root: FigmaRenderNode, designSystem: RendererDesignSystem): FigmaLayerInstruction;
//# sourceMappingURL=index.d.ts.map