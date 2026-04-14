// src/core/sdk/adapters/figmaInstructionWalker.ts
/**
 * FigmaInstructionWalker — converts DSLayerInstruction tree to actual Figma nodes.
 * Host-owned adapter. Runs in the Figma plugin context only.
 */
import type { DSLayerInstruction } from '../ports/DesignSystemPort'

export async function walkInstructions(root: DSLayerInstruction, parent: FrameNode | PageNode): Promise<void> {
  const node = await createNode(root, parent)
  if (root.children && node && 'appendChild' in node) {
    for (const child of root.children) {
      await walkInstructions(child, node as FrameNode)
    }
  }
}

async function createNode(instruction: DSLayerInstruction, parent: FrameNode | PageNode): Promise<SceneNode | null> {
  switch (instruction.type) {
    case 'frame': {
      const frame = figma.createFrame()
      frame.name = instruction.name
      parent.appendChild(frame)
      return frame
    }
    case 'text': {
      const text = figma.createText()
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
      text.name = instruction.name
      text.characters = instruction.textContent ?? ''
      parent.appendChild(text)
      return text
    }
    case 'instance': {
      const component = figma.root.findOne(
        n => n.type === 'COMPONENT' && n.name === instruction.name
      ) as ComponentNode | null
      if (!component) {
        console.warn(`[FigmaInstructionWalker] Component not found: ${instruction.name}`)
        return null
      }
      const instance = component.createInstance()
      if (instruction.textContent) {
        const textChild = instance.findOne(n => n.type === 'TEXT') as TextNode | null
        if (textChild) {
          await figma.loadFontAsync(textChild.fontName as FontName)
          textChild.characters = instruction.textContent
        }
      }
      parent.appendChild(instance)
      return instance
    }
    default: return null
  }
}
