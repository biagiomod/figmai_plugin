# Smart Detector classification rules (containment-aware)

## Overview

- **Elements**: Interactive/container UI (button, link, image, icon, etc.). Emitted from **containers** (FRAME, INSTANCE, COMPONENT, GROUP, etc.), not from raw TEXT nodes.
- **Content**: Copy types (heading_copy, body_copy, cta_copy, etc.). Classified from TEXT nodes in [contentClassifier.ts](contentClassifier.ts).
- **Containment**: Hierarchy is used to avoid emitting nested label text as a separate element (e.g. link text inside a button).

## Where the logic lives

| Rule | Location | Description |
|------|----------|-------------|
| Element vs content | [elementClassifier.ts](elementClassifier.ts) | Main loop iterates only over non-TEXT `inspectable` nodes (line ~191). TEXT nodes are never emitted as `button` or other container elements. |
| Button container predicate | [elementClassifier.ts](elementClassifier.ts) `tryButtonStructural()` | FRAME/GROUP/COMPONENT/INSTANCE (never TEXT) with: short label text, background, padding-like inset. **Heading-like** label (name contains heading/title/headline, or fontSize > 24) disqualifies: container is not emitted as button. Used to build `buttonContainerIds` for suppression. |
| Link heuristic | [elementClassifier.ts](elementClassifier.ts) `tryLinkHeuristic()` | TEXT with underline, or name contains "link"/"hyperlink", or CTA verb. Applied only to `textNodesForLinks`. |
| Containment-aware link suppression | [elementClassifier.ts](elementClassifier.ts) + [hierarchy.ts](hierarchy.ts) | Before emitting a link from a TEXT node, we check `hasInteractiveAncestor(textNode, buttonContainerIds)`. If the text is inside a button (or other interactive container), we do **not** emit a separate link element. |
| Hierarchy helpers | [hierarchy.ts](hierarchy.ts) | `getAncestors(node)`, `findNearestInteractiveAncestor(node, interactiveContainerIds)`, `hasInteractiveAncestor(node, interactiveContainerIds)`. |

## Invariants (enforced by code + tests)

1. **No TEXT as button**: Only container nodes (from `inspectable`) can be emitted as `button`; the main loop skips `node.type === 'TEXT'`, so no TEXT node is ever emitted as an element (including button). TEXT nodes are only considered for `link` via `textNodesForLinks`, and link emission is then gated by containment.
2. **No heading-as-button**: A container whose dominant text child is heading-like (node name contains "heading"/"title"/"headline", or fontSize > 24) is not classified as a button, so `heuristic:button_padding` and `heuristic:text_over_bg` do not produce a button element for heading/title frames.
3. **Nested label not link**: If a TEXT node is a descendant of a node that passes `tryButtonStructural`, that TEXT is not emitted as a `link` element (it is treated as the button’s label / content).
4. **Standalone link**: TEXT that passes `tryLinkHeuristic` and has **no** interactive ancestor is still emitted as `link`.

## Pipeline (index.ts)

1. `traverseSelection(roots)` → `inspectable` (non-TEXT) + `textNodes`.
2. `classifyElements(inspectable, { textNodesForLinks: textNodes })`:
   - Builds `buttonContainerIds` from nodes for which `tryButtonStructural(node)` is non-null.
   - Classifies each `inspectable` node (DS mapping, icon/image, button structural, name rules).
   - For each `textNodesForLinks`, skips link emission when `hasInteractiveAncestor(textNode, buttonContainerIds)`; otherwise runs `tryLinkHeuristic` and may emit `link`.
3. `classifyContent(textNodes)` → content items (heading_copy, body_copy, etc.).

No new AI/LLM calls; no changes to report formatting or transcript normalization.
