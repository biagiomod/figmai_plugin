/**
 * Unit tests for createFigmaInstructionTree.
 * Uses node:test (Node.js built-in, no additional dependencies).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createFigmaInstructionTree } from "../index.js";
import { resolveDesignSystem } from "@design-system-toolkit/schema";
// ── Fixtures ──────────────────────────────────────────────────────────────────
const acmeDS = resolveDesignSystem("acme", "default-light");
const jazzDS = resolveDesignSystem("jazz", "default-light");
const orbitDS = resolveDesignSystem("orbit", "dark");
const SIMPLE_PAGE = {
    id: "page-1",
    kind: "page",
    children: [
        {
            id: "section-1",
            kind: "section",
            children: [
                { id: "text-1", kind: "text", textContent: "Hello world" },
                { id: "button-1", kind: "button", textContent: "Click me" },
            ],
        },
    ],
};
const CARD_NODE = {
    id: "card-1",
    kind: "card",
    children: [
        { id: "heading-1", kind: "heading", textContent: "Card title" },
    ],
};
// ── Tests ─────────────────────────────────────────────────────────────────────
describe("createFigmaInstructionTree", () => {
    test("maps page node to FRAME type with correct DS name — acme", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        assert.strictEqual(result.type, "FRAME");
        assert.strictEqual(result.name, "AcmePage");
        assert.strictEqual(result.id, "page-1");
    });
    test("maps page node with jazz DS", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, jazzDS);
        assert.strictEqual(result.name, "JazzPage");
    });
    test("maps page node with orbit DS", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, orbitDS);
        assert.strictEqual(result.name, "OrbitPage");
    });
    test("maps button node to INSTANCE type", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        const section = result.children?.[0];
        const button = section?.children?.find(c => c.id === "button-1");
        assert.ok(button !== undefined, "button child found");
        assert.strictEqual(button.type, "INSTANCE");
        assert.strictEqual(button.name, "AcmeButton");
        assert.strictEqual(button.textContent, "Click me");
    });
    test("maps text node to TEXT type", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        const section = result.children?.[0];
        const text = section?.children?.find(c => c.id === "text-1");
        assert.ok(text !== undefined, "text child found");
        assert.strictEqual(text.type, "TEXT");
        assert.strictEqual(text.name, "AcmeText");
        assert.strictEqual(text.textContent, "Hello world");
    });
    test("section maps to FRAME, children preserved", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        const section = result.children?.[0];
        assert.ok(section !== undefined);
        assert.strictEqual(section.type, "FRAME");
        assert.strictEqual(section.name, "AcmeSection");
        assert.strictEqual(section.children?.length, 2);
    });
    test("card maps to INSTANCE with children", () => {
        const result = createFigmaInstructionTree(CARD_NODE, acmeDS);
        assert.strictEqual(result.type, "INSTANCE");
        assert.strictEqual(result.name, "AcmeCard");
        assert.strictEqual(result.children?.[0]?.name, "AcmeHeading");
    });
    test("heading maps to TEXT type", () => {
        const result = createFigmaInstructionTree(CARD_NODE, acmeDS);
        const heading = result.children?.[0];
        assert.strictEqual(heading?.type, "TEXT");
        assert.strictEqual(heading?.textContent, "Card title");
    });
    test("node ids are preserved in output", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        assert.strictEqual(result.id, "page-1");
        assert.strictEqual(result.children?.[0]?.id, "section-1");
    });
    test("leaf nodes have no children property", () => {
        const result = createFigmaInstructionTree(SIMPLE_PAGE, acmeDS);
        const section = result.children?.[0];
        const text = section?.children?.find(c => c.id === "text-1");
        assert.strictEqual(text?.children, undefined, "leaf text has no children");
    });
    test("throws for unmapped canonicalKind", () => {
        const unknownNode = { id: "x", kind: "unknown-kind" };
        assert.throws(() => createFigmaInstructionTree(unknownNode, acmeDS), /No DS mapping found/);
    });
    test("jazz DS maps all 24 canonical kinds without error", () => {
        const allKinds = [
            "page", "section", "text", "button", "card", "heading",
            "input", "select", "textarea", "checkbox", "radio", "switch",
            "badge", "label", "header-nav", "side-nav", "footer",
            "modal-dialog", "alert-banner", "testimonial", "faq",
            "feature-grid", "cta-section", "app-shell",
        ];
        for (const kind of allKinds) {
            const node = { id: `test-${kind}`, kind };
            assert.doesNotThrow(() => createFigmaInstructionTree(node, jazzDS), `${kind} should not throw with jazz DS`);
        }
    });
});
//# sourceMappingURL=createFigmaInstructionTree.test.js.map