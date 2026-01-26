import type { SelectionState, ToolCall } from '../types'
import { getTool } from './toolRegistry'
import { getAnalytics } from '../analytics'
import { categorizeError } from '../analytics/errorCodes'

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
  
  // Track tool call
  getAnalytics().track('tool_call', {
    toolId: toolCall.name
  })
  
  try {
    const result = await tool.execute(toolCall.arguments, selection)
    return result
  } catch (error) {
    // Track error
    getAnalytics().track('error', {
      category: categorizeError(error),
      toolId: toolCall.name
    })
    return `Error executing tool "${tool.name}": ${error}`
  }
}

