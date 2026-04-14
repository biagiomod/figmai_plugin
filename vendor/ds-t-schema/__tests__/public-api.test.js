/**
 * Unit tests for the public API — searchComponents and getPromptEnrichmentSegment.
 * Uses node:test (Node.js built-in, no additional dependencies).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { searchComponents, getPromptEnrichmentSegment } from "../public-api.js";
// ── searchComponents ──────────────────────────────────────────────────────────
describe("searchComponents", () => {
    test("returns ComponentMatch array for a matching query", async () => {
        const results = await searchComponents("button", "acme");
        assert.ok(Array.isArray(results), "returns an array");
        assert.ok(results.length > 0, "at least one match for 'button'");
    });
    test("exact canonicalKind match comes first", async () => {
        const results = await searchComponents("button", "jazz");
        assert.strictEqual(results[0]?.canonicalKind, "button", "first result is exact canonicalKind match");
        assert.strictEqual(results[0]?.componentName, "JazzButton", "correct Jazz component name");
    });
    test("matches on componentName prefix (e.g. 'Jazz')", async () => {
        const results = await searchComponents("Jazz", "jazz");
        assert.ok(results.length > 0, "matches on componentName substring");
        assert.ok(results.every(r => r.componentName.includes("Jazz")), "all results contain 'Jazz' in componentName");
    });
    test("match on description text", async () => {
        const results = await searchComponents("overlay", "acme");
        assert.ok(results.length > 0, "finds modal-dialog via description 'overlaying'");
        assert.ok(results.some(r => r.canonicalKind === "modal-dialog"), "modal-dialog is in results");
    });
    test("all results carry correct designSystem and theme", async () => {
        const results = await searchComponents("card", "orbit");
        assert.ok(results.length > 0);
        for (const r of results) {
            assert.strictEqual(r.designSystem, "orbit");
            assert.strictEqual(r.theme, "dark", "orbit default theme is dark");
        }
    });
    test("theme override is reflected in results", async () => {
        const results = await searchComponents("card", "acme", "custom-theme");
        assert.ok(results.length > 0);
        assert.strictEqual(results[0]?.theme, "custom-theme");
    });
    test("returns empty array for empty query", async () => {
        const results = await searchComponents("", "acme");
        assert.strictEqual(results.length, 0);
    });
    test("returns empty array for unknown design system", async () => {
        const results = await searchComponents("button", "nonexistent-ds");
        assert.strictEqual(results.length, 0);
    });
    test("case-insensitive matching", async () => {
        const lower = await searchComponents("button", "nuxt-ui");
        const upper = await searchComponents("BUTTON", "nuxt-ui");
        const mixed = await searchComponents("Button", "nuxt-ui");
        assert.deepStrictEqual(lower.map(r => r.canonicalKind), upper.map(r => r.canonicalKind), "case-insensitive: lower vs upper");
        assert.deepStrictEqual(lower.map(r => r.canonicalKind), mixed.map(r => r.canonicalKind), "case-insensitive: lower vs mixed");
    });
    test("ComponentMatch shape has required fields", async () => {
        const results = await searchComponents("nav", "jazz");
        assert.ok(results.length > 0);
        const match = results[0];
        assert.ok(typeof match.canonicalKind === "string", "canonicalKind is string");
        assert.ok(typeof match.componentName === "string", "componentName is string");
        assert.ok(typeof match.designSystem === "string", "designSystem is string");
        assert.ok(typeof match.theme === "string", "theme is string");
    });
    test("results are deterministic — same query returns same order", async () => {
        const a = await searchComponents("input", "acme");
        const b = await searchComponents("input", "acme");
        assert.deepStrictEqual(a.map(r => r.canonicalKind), b.map(r => r.canonicalKind), "two identical calls produce the same order");
    });
});
// ── getPromptEnrichmentSegment ────────────────────────────────────────────────
describe("getPromptEnrichmentSegment", () => {
    test("returns a string for a valid design system", () => {
        const result = getPromptEnrichmentSegment("acme");
        assert.ok(typeof result === "string", "returns string");
        assert.ok(result.length > 0, "non-empty string");
    });
    test("includes design system name", () => {
        const result = getPromptEnrichmentSegment("jazz");
        assert.ok(result?.includes("Jazz"), "includes display name 'Jazz'");
    });
    test("includes primary color", () => {
        const acme = getPromptEnrichmentSegment("acme");
        assert.ok(acme?.includes("#00C16A"), "acme includes primary color #00C16A");
        const jazz = getPromptEnrichmentSegment("jazz");
        assert.ok(jazz?.includes("#005EB8"), "jazz includes primary color #005EB8");
    });
    test("includes component names", () => {
        const result = getPromptEnrichmentSegment("acme");
        assert.ok(result?.includes("AcmeButton"), "includes mapped component name");
    });
    test("uses default theme when none provided", () => {
        const orbit = getPromptEnrichmentSegment("orbit");
        assert.ok(orbit?.includes("dark"), "orbit default theme is dark");
    });
    test("theme override is reflected in output", () => {
        const result = getPromptEnrichmentSegment("acme", "custom-theme");
        assert.ok(result?.includes("custom-theme"), "custom theme appears in output");
    });
    test("returns undefined for unknown design system", () => {
        const result = getPromptEnrichmentSegment("not-a-real-ds");
        assert.strictEqual(result, undefined);
    });
    test("output is deterministic — same call returns same string", () => {
        const a = getPromptEnrichmentSegment("nuxt-ui");
        const b = getPromptEnrichmentSegment("nuxt-ui");
        assert.strictEqual(a, b, "deterministic output");
    });
    test("enterprise DS includes tier information", () => {
        const result = getPromptEnrichmentSegment("jazz");
        assert.ok(result?.includes("enterprise"), "Jazz segment mentions 'enterprise'");
    });
    test("covers all four supported design systems without throwing", () => {
        const ids = ["acme", "orbit", "nuxt-ui", "jazz"];
        for (const id of ids) {
            const result = getPromptEnrichmentSegment(id);
            assert.ok(typeof result === "string", `${id} returns a string`);
        }
    });
});
//# sourceMappingURL=public-api.test.js.map