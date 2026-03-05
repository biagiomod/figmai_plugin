import { parseJsonBody } from '../http'
import { adminEditableModelSchema, validateModel } from '../schemas'

export async function validateResponse(body: string | undefined | null) {
  const payload = parseJsonBody<unknown>(body)
  const parsed = adminEditableModelSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      statusCode: 400,
      payload: {
        errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        warnings: []
      }
    }
  }
  const validation = validateModel(parsed.data)
  return {
    statusCode: 200,
    payload: validation
  }
}

