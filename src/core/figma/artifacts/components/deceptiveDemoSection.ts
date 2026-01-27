/**
 * Deceptive Demo Cards Container
 * 
 * Creates a reusable Auto-Layout Frame container for deceptive demo cards.
 * This replaces a Figma Section (which cannot be created via plugin API) with
 * equivalent behavior: horizontal auto-layout with consistent styling.
 * 
 * This container is the canonical way to group deceptive demo cards and is
 * designed to be reusable for future demo cards.
 */

import { rgbToPaint, applyAutoLayout } from '../../../../assistants/dca/demoAssets/primitives'

/**
 * Create a container for deceptive demo cards
 * 
 * Creates an Auto-Layout Frame with:
 * - Horizontal direction
 * - Background fill: #BE6517
 * - Padding: 20px (all sides)
 * - Item spacing: 20px (gap between cards)
 * - Layout sizing: AUTO for both axes
 * 
 * @param cards - Array of card frame nodes to add as children
 * @returns FrameNode configured as horizontal container with cards appended
 */
export function createDemoCardContainer(cards: FrameNode[]): FrameNode {
  const container = figma.createFrame()
  container.name = 'Deceptive Demo – Container'
  
  // Configure horizontal auto-layout
  applyAutoLayout(container, {
    direction: 'HORIZONTAL',
    padding: 20, // 20px padding on all sides
    itemSpacing: 20, // 20px spacing between cards
    primaryAxisSizingMode: 'AUTO', // Width: auto (hugs content)
    counterAxisSizingMode: 'AUTO' // Height: auto (hugs content)
  })
  
  // Apply background color: #BE6517
  // Convert hex to RGB: #BE6517 = rgb(190, 101, 23) = rgb(0.745, 0.396, 0.090)
  container.fills = [rgbToPaint({ r: 0.745, g: 0.396, b: 0.090 })]
  
  // Append all cards as children (in order)
  for (const card of cards) {
    container.appendChild(card)
  }
  
  return container
}

/**
 * Enforce fixed 320px width on a deceptive demo card
 * 
 * Safety check to ensure all cards have consistent width.
 * Cards should already have 320px width from their builders, but this
 * provides an additional validation layer.
 * 
 * @param card - The card frame node to enforce width on
 */
export function enforceCardWidth(card: FrameNode): void {
  if (card.width !== 320) {
    // Resize to 320px width, keep height (auto-driven by content)
    card.resize(320, card.height)
  }
}
