/**
 * ACE schema — re-exports from shared/ace-config/schemas.
 * Lambda routes import from here; do not add local schema definitions.
 */
export {
  configSchema,
  assistantsManifestSchema,
  adminEditableModelSchema,
  saveRequestBodySchema,
  validateModel,
  KB_ID_REGEX,
  doDontSchema,
  knowledgeBaseDocumentSchema,
  getDefaultKbDocument
} from '../../../shared/ace-config/schemas'

export type {
  Config,
  AssistantsManifest,
  AssistantManifestEntry,
  AdminEditableModel,
  SaveRequestBody,
  ValidationResult,
  KnowledgeBaseDocument
} from '../../../shared/ace-config/schemas'
