# SDK Migration Guide

## Engine swap: SD-T (Smart Detector Toolkit)

When SD-T is ready for integration:

1. **Build SD-T:** `pnpm build` in the SD-T repo
2. **Vendor the dist:**
   ```bash
   cp -r packages/detector-figma/dist vendor/smart-detector/
   ```
3. **Create the adapter:**
   ```typescript
   // src/core/detection/smartDetector/SDToolkitSmartDetectionEngine.ts
   import type { SmartDetectionPort, SmartDetectionResult } from '../../sdk/ports/SmartDetectionPort'
   import { traverseFigmaNode } from '../../../vendor/smart-detector/...'
   import { serializeFigmaNode } from '../../sdk/adapters/figmaNodeSerializer'
   
   export class SDToolkitSmartDetectionEngine implements SmartDetectionPort {
     async detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]> {
       // serialize SceneNode → FigmaNode JSON, call traverseFigmaNode, map result
     }
   }
   ```
4. **Register the new engine:** In each consumer that instantiates `DefaultSmartDetectionEngine`, replace with `SDToolkitSmartDetectionEngine`. There are currently two consumers:
   - `src/core/assistants/handlers/smartDetector.ts`
   - `src/core/analyticsTagging/autoAnnotator.ts`
5. **Verify:** `npm run build && npm run test && npm run invariants`

No changes to port contracts or handler logic are needed.

## Engine swap: DS-T (Design System Toolkit)

When DS-T is ready:

1. **Build DS-T:** `pnpm build` in the DS-T repo
2. **Vendor the dist:** Copy `packages/renderer-figma/dist` to `vendor/design-system-toolkit/`
3. **Create adapters** for each DS port (DSPromptEnrichmentPort, DSQueryPort, DSPlacementPort)
4. **Register new engines** in consumers
5. **Verify:** `npm run build && npm run test && npm run invariants`

## The invariant check

`npm run invariants` includes port compliance checks (invariants #8 and #9). If a direct import of a detector or DS internal sneaks in, the check will catch it. Allowed direct importers are only the Default*Engine files.
