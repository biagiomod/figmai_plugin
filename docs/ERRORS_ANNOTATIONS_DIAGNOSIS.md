# Native Figma Annotations — Diagnosis Report (Generate Error Screens)

## Purpose

Diagnose why native Figma annotations do not appear for **Errors → Generate Error Screens** and apply the smallest fix. User had annotations visibility enabled and still saw no native annotations.

---

## Diagnostics Implemented

1. **Handler execution**  
   At start of the annotation step: `figma.notify('Generate Error Screens: running annotation step…')`.

2. **API availability**  
   Log/notify:
   - `figma.annotations` exists
   - `figma.annotations.getAnnotationCategoriesAsync` exists
   - `figma.annotations.addAnnotationCategoryAsync` exists  
   (Console log + one notify summarizing the three.)

3. **Node support**  
   Before assignment, per clone:
   - `clone.type`
   - `'annotations' in clone`
   - Current `clone.annotations` value (or "missing").

4. **Assignment success**  
   After setting `clone.annotations`:
   - Read back `clone.annotations` (length / first label).
   - Notify: "Annotation set on &lt;clone.name&gt;" or "Annotation assignment failed: &lt;error&gt;".
   - Assignment errors are no longer swallowed; they are surfaced via `figma.notify` (including `error.message`).

5. **Category creation**  
   - `AnnotationCategoryColor` set to lowercase `'orange'` (Figma API may expect lowercase).
   - If category creation fails, we proceed without `categoryId` and still set annotations.

6. **Visibility**  
   In-code comment: annotations are typically visible in Dev Mode and can be toggled in View → Annotations.

---

## Root Cause Hypotheses (to be confirmed by run)

| Hypothesis | How to confirm |
|------------|----------------|
| **API missing** | First notify shows "running annotation step"; API notify shows `figma.annotations=no` or `getCategories=no`. |
| **Node unsupported** | Console shows `'annotations' in clone=false` or clone type not supporting annotations. |
| **Assignment failing** | Notify shows "Annotation assignment failed: …" or "readback empty". |
| **Guard too strict** | Previously: `Array.isArray((node as any).annotations)` could skip assignment if runtime doesn’t initialize as Array. **Fix applied:** guard removed; only `'annotations' in node` is required. |
| **Category color invalid** | Category creation could fail with uppercase `'ORANGE'`. **Fix applied:** use lowercase `'orange'`. |
| **Visibility misunderstanding** | User already enabled View → Annotations; if (1)–(4) show success, then visibility/support is the remaining factor. |

---

## Code Fixes Applied (minimal)

### 1. `ANNOTATION_CATEGORY_COLOR`

- **Before:** `'ORANGE' as const`
- **After:** `'orange'` (lowercase; align with Figma API expectations)

### 2. `setNodeAnnotations` guard and error handling

- **Before:** Required both `'annotations' in node` and `Array.isArray((node as any).annotations)`; inner try/catch swallowed assignment errors.
- **After:** Only requires `'annotations' in node`. No inner try/catch; assignment can throw and caller surfaces the error via `figma.notify`.

### 3. Call site (Generate Error Screens)

- Notify at start: "Generate Error Screens: running annotation step…"
- Log/notify API existence.
- Per clone: log `clone.type`, `'annotations' in clone`, current `clone.annotations`.
- Try/catch around `setNodeAnnotations`; on success, read back and notify "Annotation set on &lt;name&gt;" or "readback empty"; on throw, notify "Annotation assignment failed: &lt;error.message&gt;".

---

## How to Complete the Diagnosis (run in Figma)

1. Build the plugin (`npm run build` or your usual command).
2. In Figma: select a **Frame**, run **Errors → Generate Error Screens**.
3. Observe:
   - **"Generate Error Screens: running annotation step…"** → handler ran.
   - **"Annotations API: yes/no, getCategories=…, addCategory=…"** → API availability.
   - **Console:** `[Errors] clone.type=`, `'annotations' in clone=`, `current clone.annotations=` → node support.
   - **"Annotation set on …"** vs **"Annotation assignment failed: …"** → assignment success or failure.
4. Check canvas: do native annotations appear on the generated clones? (View → Annotations on; Dev Mode if applicable.)

---

## Expected Report Output (after one run)

Fill in after running once:

- **Handler ran:** Yes / No
- **figma.annotations API exists:** Yes / No (and getCategories / addCategory)
- **Clone supports annotations:** Yes / No (type + `'annotations' in clone` + initial value)
- **Assignment succeeded (readback):** Yes / No (notify + readback length/label)
- **Root cause conclusion:** One of: API missing, node unsupported, assignment failing, visibility/support limitation.

If the root cause was the guard or the category color, the applied fixes should allow annotations to appear on the next run.

---

## Final Code (helpers + annotation block)

See current implementation in:

- `figmai_plugin/src/core/assistants/handlers/errors.ts`
  - `ANNOTATION_CATEGORY_COLOR`, `ensureAnnotationCategory`, `setNodeAnnotations`
  - In `handleGenerateErrorScreens`: the block from `figma.notify('Generate Error Screens: running annotation step…')` through the per-clone annotation set and notify.

Validation: Run Generate Error Screens on a Frame; confirm the notifies above and that native annotations appear on the clones (or that the notifies provide definitive evidence why they cannot in this environment).
