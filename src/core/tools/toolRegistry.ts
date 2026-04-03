import type { ToolDefinition } from '../types'
import { annotateNodesTool, readAnnotationsTool, createChecklistFrameTool } from './figmaTools'
import { createFromTemplateJsonTool, exportSelectionToTemplateJsonTool } from './jsonTools'
import { designSystemTool } from './designSystemTools'

/**
 * Tool Registry
 * Central registry of all available tools
 */
const TOOLS: Map<string, ToolDefinition> = new Map([
  [annotateNodesTool.id, annotateNodesTool],
  [readAnnotationsTool.id, readAnnotationsTool],
  [createChecklistFrameTool.id, createChecklistFrameTool],
  [createFromTemplateJsonTool.id, createFromTemplateJsonTool],
  [exportSelectionToTemplateJsonTool.id, exportSelectionToTemplateJsonTool],
  [designSystemTool.id, designSystemTool]
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

