import type { SelectionState, ToolCall } from '../types'
import { getTool } from './toolRegistry'

/**
 * Route and execute a tool call
 */
export async function routeToolCall(
  toolCall: ToolCall,
  selection?: SelectionState
): Promise<string> {
  const tool = getTool(toolCall.name)
  
  if (!tool) {
    return `Error: Unknown tool "${toolCall.name}"`
  }
  
  // Check selection requirement
  if (tool.requiresSelection && !selection?.hasSelection) {
    return `Error: Tool "${tool.name}" requires a selection`
  }
  
  try {
    const result = await tool.execute(toolCall.arguments, selection)
    return result
  } catch (error) {
    return `Error executing tool "${tool.name}": ${error}`
  }
}

