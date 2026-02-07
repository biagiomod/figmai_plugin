> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# AT-A ActionID Audit Report

**Issue:** Analytic Tagging Assistant (AT-A) produces rows where ActionID equals layer names (e.g. "Heading 2", "Card", "Button") instead of ActionID annotation values (e.g. "LoseWeightCard", "BuildMuscleCard", "ContinueButton").

**Goal:** Identify where ActionID is derived and why annotation values are not being read.

---

## 1. Files and functions involved

| File | Function / area | Role |
|------|----------------------------------|------|
| `src/core/assistants/handlers/analyticsTagging.ts` | `handleResponse`, action `get-analytics-tags` | Entry: validates selection, calls `scanVisibleActionIds`, then `actionIdFindingsToRows`. |
| `src/core/analyticsTagging/selection.ts` | `validateEligibleScreenSelection`, `scanVisibleActionIds`, `actionIdFindingsToRows` | Validates single ScreenID root; walks visible descendants; maps findings to table rows. |
| `src/core/analyticsTagging/annotations.ts` | `getAnnotationLabels`, `parseTagFromLabel`, `readScreenIdFromNode`, `readActionIdFromNode` | Reads Figma dev-mode `node.annotations`; parses "ScreenID"/"ActionID" from labels; fallback to layer/node name. |

**Flow:** User runs **Get Analytics Tags** → handler validates one selected frame/component → `readScreenIdFromNode(screenNode, screenNode.name)` for ScreenID → `scanVisibleActionIds(screenNode)` walks every visible descendant and calls `readActionIdFromNode(n)` per node → findings become rows; `actionId` and `actionName` come from that scan.

---

## 2. Current ActionID extraction logic (priority order)

1. **Annotation labels (intended source)**  
   - **File:** `src/core/analyticsTagging/annotations.ts`  
   - **Logic:** `getAnnotationLabels(node)` reads `node.annotations` (Figma dev-mode API: `label` / `labelMarkdown`).  
   - `readActionIdFromNode(node)` loops those labels and uses `parseTagFromLabel(label, 'ActionID')`, which accepts:
     - `"ActionID: value"` (colon)
     - `"ActionID=value"` (equals)
   - **Lines:** Labels from `annotations` at 20–36; parsing at 6–18; ActionID read at 50–57 (now with debug at 65–72 / 78–88).

2. **Fallback: node name**  
   - **File:** `src/core/analyticsTagging/annotations.ts`  
   - **Logic:** If no label parses as ActionID, `readActionIdFromNode` returns `node.name || 'Unknown'` and `fromFallback: true`.  
   - **Lines:** 74–89 (including debug when fallback is used).

So when you see "Button" or "Card" as ActionID, the code has taken the **node.name fallback** because no ActionID was found in `node.annotations`.

---

## 3. How annotations are represented in this repo

- **Figma dev-mode annotations:** The only mechanism used for ActionID/ScreenID is `node.annotations` (array of `{ label?, labelMarkdown? }`). There is **no** use of `pluginData` or custom plugin keys for these tags in the analytics-tagging path.
- **ScreenID vs ActionID:** Same convention. `readScreenIdFromNode(node, fallbackName)` uses the same `getAnnotationLabels` + `parseTagFromLabel(label, 'ScreenID')`, then fallback `fallbackName || node.name`. ScreenID often “works” because the **selected** node is the frame/component that has the ScreenID annotation (or its name is used). ActionID fails when the **interactive element** (button, card, etc.) does not have an annotation and we fall back to its layer name.
- **Annotation tool in repo:** `src/core/tools/figmaTools.ts` (Annotate Selection) creates **text nodes** with `characters = annotationText`. It does **not** set `node.annotations`. So any “annotation” created by that tool is a **separate text layer**, not a dev-mode annotation. The AT-A code does **not** read from text layer `characters`; it only reads `node.annotations`.

---

## 4. Why ActionID equals layer name (root cause)

- **Primary cause:** For the nodes that become rows, `node.annotations` is either missing or does not contain a label that parses as ActionID. So the code always takes the **node.name fallback** (e.g. "Button", "Card", "Heading 2").
- **Possible reasons:**
  1. **Annotations not on the target node:** Designers add a **separate** text layer or component (e.g. "ActionID: ContinueButton") next to the button. The **button** node has no `annotations`; the **text** node has the string in `characters`, not in `annotations`. We only read from the button, so we get `button.name`.
  2. **Annotations not used:** Files were authored without dev-mode annotations; only layer names exist. So every node falls back to `node.name`.
  3. **Wrong node type:** Figma supports `annotations` on specific types (e.g. Frame, Component, Instance, Rectangle, Text, etc.). If the “action” is a GROUP or another type that doesn’t expose or persist annotations the same way, we might still be reading a child that has no annotation.
  4. **Annotation on parent/sibling:** The ActionID label might be on a parent or sibling (e.g. a wrapper frame), not on the clickable node we walk. We don’t associate a sibling’s or parent’s label with the current node.

So the implementation is **correct for the API it uses** (dev-mode `annotations` on the same node); the issue is that **the source of truth in the file is not that API** (e.g. text layers or different node) or annotations are missing.

---

## 5. Instrumentation (debug logs, no behavior change)

- **Scope:** `subsystem:analytics_tagging` (default off).  
- **Config:** `src/core/config.ts` — add `'subsystem:analytics_tagging': false` under `CONFIG.dev.debug.scopes`. Set to `true` (or override via custom config) to enable.
- **Logs (dev console only, no content leak):**
  - **annotations.ts**
    - For each `readActionIdFromNode` / `readScreenIdFromNode` call: `nodeId`, `nodeType`, `nodeName`, `source` (`'annotation'` | `'nodeNameFallback'`), `value`. For fallback, `labelsCount` is also logged.
  - **selection.ts**
    - Start of `scanVisibleActionIds`: `screenNodeId`, `screenNodeType`, `screenNodeName`.
    - End: `findingsCount`, `nodeIds` (ids only).

**How to use:** Enable `subsystem:analytics_tagging` in config, run Get Analytics Tags, and check the console. If you see `source: 'nodeNameFallback'` and `value` equal to the layer name for every row, annotations are not present on those nodes (or not in `node.annotations`).

---

## 6. Minimal fix strategy (no broad refactor)

- **Option A – Design/process:** Ensure ActionID is set as **dev-mode annotations on the same node** that should get that ActionID (the button/card/frame we traverse). Then the existing code will pick it up.
- **Option B – Code: support “annotation” text layers:** If the convention is a **sibling or child text node** whose `characters` match `"ActionID: ..."` or `"ActionID=..."`:
  - In `readActionIdFromNode(node)` (or a small helper), when `getAnnotationLabels(node)` yields no ActionID, look at the node’s **parent** and **siblings** (and optionally their children) for a **TextNode** whose `characters` trim to a string that `parseTagFromLabel(..., 'ActionID')` can parse. Associate that value with `node` (e.g. return it and treat as non-fallback). Limit search (e.g. same parent, one level) and avoid reading large text bodies to prevent leaks.
- **Option C – Code: read from a specific pluginData key:** If the org stores ActionID in `node.getPluginData('key')`, add a branch in `readActionIdFromNode`: if present and non-empty, return that and `fromFallback: false`. Keep annotation path first so dev-mode annotations still win.

Do **not** change the overall flow (who gets validated, who gets scanned) or the row schema; only extend **where** we read the ActionID value from (annotations → optional text sibling/child or pluginData) so that when annotations are missing we can still resolve the intended value when it exists elsewhere.

---

## 7. Summary

| Question | Answer |
|----------|--------|
| Where is ActionID derived? | `readActionIdFromNode()` in `src/core/analyticsTagging/annotations.ts`; called per node from `scanVisibleActionIds()` in `selection.ts`. |
| Current priority | 1) Dev-mode `node.annotations` (label/labelMarkdown parsed for "ActionID:" or "ActionID="); 2) Fallback `node.name`. |
| Why values aren’t read | For those nodes, `node.annotations` has no ActionID, so fallback to `node.name` (e.g. "Button", "Card") is used. Annotations may be on a different node (e.g. text layer) or not used at all. |
| Minimal fix | Keep existing behavior; optionally add: (B) read ActionID from a nearby text node’s `characters`, or (C) from `pluginData`, with a clear convention and bounded search. |
| Debug | Enable `subsystem:analytics_tagging` and inspect console for `source` and `value` per node to confirm annotation vs nodeNameFallback. |
