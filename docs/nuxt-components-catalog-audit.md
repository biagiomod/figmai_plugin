# Nuxt Components Catalog Audit

**Historical source:** Nuxt components export used during the audit (no longer kept in the repo)  
**Historical normalized output:** normalized catalog artifact produced during the audit (no longer kept in the repo)  
**Date:** 2026-01-21

---

## 1. What was wrong and what was fixed

### 1.1 Validation result

- **Parse:** The original file was already **valid JSON** (strict parser; no JSON5). It is a single root array of 1,738 objects.
- **Structure:** No array wrapper with metadata. The fix applied **Option A**: wrap in an object with `designSystemId`, `source`, `scrapedAt`, and `components`.

### 1.2 Fixes applied

| Issue | Action |
|-------|--------|
| No design-system metadata | Wrapped in `{ designSystemId, source, scrapedAt, components }`. `designSystemId`: `"nuxt-ui-v4"`, `source`: `"https://ui.nuxt.com/figma"`, `scrapedAt`: ISO timestamp at fix time. |
| Kind normalization | Ensured `kind` is exactly `"component"` or `"component_set"` (no other values found). |
| Name/key safety | Trimmed `name`; ensured `key` non-empty. No entries were dropped (all had valid keys). |
| Character/quote safety | Scanned: **no smart quotes**, **no control characters** in the original file. No changes needed. |
| Deduplication | **No duplicate keys** (0). No duplicate (name + key) pairs. No deduplication performed. |

### 1.3 Counts

| Metric | Original | Fixed (canonical) |
|--------|----------|-------------------|
| Total entries | 1,738 | 1,738 |
| `component` | 1,598 | 1,598 |
| `component_set` | 140 | 140 |
| Duplicate keys removed | — | 0 |
| Entries with missing key | 0 | 0 |

---

## 2. DS sufficiency audit

### 2.1 Is this enough to import and instance components in a file?

- **Yes.** The plugin uses **`figma.importComponentByKeyAsync(key)`** (see `src/core/designSystem/componentService.ts`). The key is the only required input for import; no team library or file reference is needed. The file is published/linked so that Figma can resolve the key.
- **API:** `importComponentByKey(key)` → then `createInstance()` (for `COMPONENT`) or select variant then `createInstance()` (for `COMPONENT_SET`). Optional `variantProperties` (for component sets) are passed to `createComponentInstance()` and matched against `child.variantProperties`; property names must match Figma’s (including Unicode symbols in axis names).
- **Library permission:** No extra “team library” permission is required beyond the plugin’s ability to import by key; the Nuxt UI Figma file must be accessible (e.g. same team or shared library).

### 2.2 What is missing for reliable variant selection?

- **Variant axes + values:** The catalog **already includes** `variantAxes` and `defaultVariant` for all 140 component sets. Axis names are Figma’s actual property names (e.g. `"◆ Variant"`, `"📏 Size"`, `"👁️ Description"`). These must be kept as-is for `instance.setProperties(variantProperties)` to work.
- **Deriving at runtime:** Variant properties can also be read from the imported `ComponentSetNode` (e.g. `componentSet.children`, `child.variantProperties`). The scraped `variantAxes`/`defaultVariant` are still useful for LLM/UI so the assistant can choose variants without importing first. **Recommendation:** Keep `variantAxes` and `defaultVariant` in the catalog.

### 2.3 Minimal subset sufficient for demo

For a **minimal demo** (Button, Input/Form Field, Alert, Modal/Dialog, Toast/Notification), the following are present and sufficient:

| Component type | Catalog name(s) | Key (example) | Kind |
|----------------|------------------|---------------|------|
| Alert | Alert | bc3212c8e58738e4c2c15848f6565ced7f29f550 | component_set |
| Button | ButtonPrimary, ButtonSecondary, ButtonGroup, … | e.g. dd5e57b760caeabfb383b04d688522683cfa3494 | component / component_set |
| Input / Form field | InputOutline, InputSoft, InputSubtle, FormField, … | e.g. 1c4b817bfcfeb1201f3b3604d90cb82ac34f0a9e | component / component_set |
| Modal / Dialog | Modal | 3e4b76a86ae3855d63e6ac5e41a1677b19d0efd7 | component_set |
| Toast / Notification | Toast | 739fe6b9c5b841854eaaa9075f066f4f4206d040 | component_set |

**Recommended minimal list for a demo:** Alert, Modal, Toast, ButtonPrimary (or ButtonGroup), InputOutline or InputSoft, and optionally FormField. Filter the fixed catalog by these names (or by a small allowlist of keys) to keep the demo payload lean.

### 2.4 What can be removed safely?

- **For import/placement only:** Only `kind`, `name`, and `key` are strictly required. For component sets, `variantAxes` and `defaultVariant` are needed for correct variant selection in the plugin.
- **Removable for a “lean” catalog:**  
  - **`defaultVariant`** can be derived at runtime from the component set (e.g. first child or Figma default). Removing it would reduce size but would require code to compute defaults.  
  - **Icon/simple `component` entries** (e.g. zoom-out, zap, youtube): if the demo does not need 1,598 icons, a lean catalog can keep only `component_set` entries plus a short allowlist of named components (Button*, Input*, Alert, Modal, Toast, FormField, etc.).  
- **Do not remove:** `key`, `kind`, `name`; for component_set, `variantAxes` (and preferably `defaultVariant`) for correct variant selection and LLM/UI.

### 2.5 Recommended “next scrape” fields (if any)

- **Optional for KB/LLM:** `purpose`, `whenToUse`, `whenNotToUse` (see `custom/design-systems/example/registry.json` and `ComponentEntry` in `src/core/designSystem/types.ts`). These are not in the current scrape; adding them would improve assistant behavior.
- **Optional for display:** Human-readable labels for variant axes (e.g. map `"◆ Variant"` → “Variant”) for docs/KB only; keep raw axis names in the catalog for Figma API.
- **Optional for accessibility:** `accessibility` (minSize, requiredLabels, etc.) if the design system exposes it in Figma or docs.

---

## 3. DS catalog interface (standard structure for future catalogs)

To standardize future DS catalogs (Nuxt UI and others), use the following structure.

### 3.1 Canonical catalog shape (recommended)

```json
{
  "designSystemId": "string",
  "source": "string (URL or origin)",
  "scrapedAt": "ISO8601 timestamp",
  "components": [
    {
      "kind": "component | component_set",
      "name": "string",
      "key": "string (Figma component key)"
    },
    {
      "kind": "component_set",
      "name": "string",
      "key": "string",
      "variantAxes": { "PropertyName": ["value1", "value2", ...] },
      "defaultVariant": { "PropertyName": "value" }
    }
  ]
}
```

- **Required for every entry:** `kind`, `name`, `key`.  
- **Required for `component_set`:** `variantAxes` (and preferably `defaultVariant`) so the plugin can select variants without importing first. Property names must match Figma (including Unicode).  
- **Optional:** `aliases`, `purpose`, `whenToUse`, `whenNotToUse`, `examples`, `docFile`, `accessibility` (for KB/LLM and docs; not required for import/placement).

### 3.2 Rules

- **Strict JSON:** No comments, no trailing commas, no unescaped newlines in strings.  
- **Keys:** Non-empty; unique per catalog.  
- **Kind:** Exactly `"component"` or `"component_set"`.  
- **Names:** Trimmed; casing preserved.  
- **Variant axis names:** Preserve Figma’s exact strings (including symbols) for API compatibility.

### 3.3 Mapping to plugin `ComponentEntry`

The plugin’s `ComponentEntry` (see `src/core/designSystem/types.ts`) expects `name`, `key`, `purpose`, `whenToUse`, and optionally `isComponentSet`, `variantProperties`. A catalog like Nuxt’s can be mapped as follows:

- `kind === "component_set"` → `isComponentSet: true`.  
- `variantAxes` → `variantProperties` (use same keys for `setProperties`).  
- `purpose` / `whenToUse` must be added from docs or a separate scrape; they are not in the current Nuxt catalog.

---

## 4. Deliverables

| Deliverable | Path |
|-------------|------|
| Historical normalized catalog artifact | Removed from the repo after the audit cleanup pass |
| Audit report | `figmai_plugin/docs/nuxt-components-catalog-audit.md` (this file) |

---

## 5. Verification

- Parsing of the normalized catalog artifact was verified at audit time before the reference files were removed from the repo.
- This document is retained as historical audit context only; there is no current in-repo artifact to re-parse.
