/**
 * ACE schema — re-exports from shared/ace-config/schemas.
 * Local consumers (server.ts, save.ts, model.ts) import from here.
 */
export {
  configSchema,
  assistantsManifestSchema,
  adminEditableModelSchema,
  saveRequestBodySchema,
  validateModel
} from '../../shared/ace-config/schemas'

export type {
  Config,
  AssistantsManifest,
  AssistantManifestEntry,
  AdminEditableModel,
  SaveRequestBody,
  ValidationResult
} from '../../shared/ace-config/schemas'
