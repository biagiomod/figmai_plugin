import type { ToolDefinition } from '../types'
import { annotateSelectionTool, createChecklistFrameTool } from './figmaTools'
import { createFromTemplateJsonTool, exportSelectionToTemplateJsonTool } from './jsonTools'

/**
 * Tool Registry
 * Central registry of all available tools
 */
const TOOLS: Map<string, ToolDefinition> = new Map([
  [annotateSelectionTool.id, annotateSelectionTool],
  [createChecklistFrameTool.id, createChecklistFrameTool],
  [createFromTemplateJsonTool.id, createFromTemplateJsonTool],
  [exportSelectionToTemplateJsonTool.id, exportSelectionToTemplateJsonTool]
])

/**
 * Get tool by ID
 */
export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.get(id)
}

/**
 * Get all tools
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(TOOLS.values())
}

/**
 * Get tools that require selection
 */
export function getToolsRequiringSelection(): ToolDefinition[] {
  return getAllTools().filter(tool => tool.requiresSelection)
}

