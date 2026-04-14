function lookupMapping(designSystem, kind) {
    const mapping = designSystem.components.find(m => m.canonicalKind === kind);
    if (mapping === undefined) {
        throw new Error(`No DS mapping found for canonical kind: ${kind}`);
    }
    return mapping;
}
function mapNodeToLayer(node, designSystem) {
    const mapping = lookupMapping(designSystem, node.kind);
    const children = mapChildren(node.children, designSystem);
    switch (node.kind) {
        case "page":
            return {
                id: node.id,
                type: "FRAME",
                name: mapping.componentName,
                ...(children !== undefined && { children })
            };
        case "section":
            return {
                id: node.id,
                type: "FRAME",
                name: mapping.componentName,
                ...(children !== undefined && { children })
            };
        case "text":
            return {
                id: node.id,
                type: "TEXT",
                name: mapping.componentName,
                textContent: node.textContent ?? ""
            };
        case "button":
            return {
                id: node.id,
                type: "INSTANCE",
                name: mapping.componentName,
                textContent: node.textContent ?? ""
            };
        case "card":
            return {
                id: node.id,
                type: "INSTANCE",
                name: mapping.componentName,
                ...(children !== undefined && { children })
            };
        case "heading":
        case "badge":
        case "label":
            return {
                id: node.id,
                type: "TEXT",
                name: mapping.componentName,
                textContent: node.textContent ?? ""
            };
        case "header-nav":
        case "side-nav":
        case "footer":
        case "app-shell":
        case "feature-grid":
        case "cta-section":
        case "modal-dialog":
        case "alert-banner":
        case "testimonial":
        case "faq":
        case "input":
        case "select":
        case "textarea":
        case "checkbox":
        case "radio":
        case "switch":
            return {
                id: node.id,
                type: "FRAME",
                name: mapping.componentName,
                ...(children !== undefined && { children })
            };
    }
}
function mapChildren(children, designSystem) {
    if (!children || children.length === 0) {
        return undefined;
    }
    return children.map(child => mapNodeToLayer(child, designSystem));
}
export function createFigmaInstructionTree(root, designSystem) {
    return mapNodeToLayer(root, designSystem);
}
//# sourceMappingURL=index.js.map