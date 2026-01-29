/**
 * Work Adapter Override (No-op Stub)
 *
 * This file is committed to the repo as a safe no-op stub so that the dynamic
 * import in src/core/work/loadAdapter.ts resolves in all environments (fresh
 * clone, CI). It exports the default no-op adapter; custom variants overwrite
 * this file locally or in private forks.
 *
 * No secrets, no environment-specific endpoints, no external integrations.
 */

import { createDefaultWorkAdapter } from '../core/work/defaultAdapter'

export default createDefaultWorkAdapter()
