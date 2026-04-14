// src/core/designSystem/DefaultDSPlacementEngine.ts
import type { DSPlacementPort, DSLayerInstruction } from '../sdk/ports/DesignSystemPort'
import { walkInstructions } from '../sdk/adapters/figmaInstructionWalker'

export class DefaultDSPlacementEngine implements DSPlacementPort {
  async executeInstructions(root: DSLayerInstruction): Promise<void> {
    await walkInstructions(root, figma.currentPage)
  }
}
