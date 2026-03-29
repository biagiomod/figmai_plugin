// src/assistants/evergreens/index.ts
/**
 * Evergreens Assistant Module
 * Owned by: Evergreens Team
 *
 * To extend: add logic to handler.ts.
 * Do NOT import from core internals — use ../../sdk only.
 */
import type { AssistantModule } from '../../sdk'
import { ContentTableHandler } from './handler'

const evergreensModule: AssistantModule = {
  assistantId: 'content_table',
  handler: new ContentTableHandler(),
}

export default evergreensModule
