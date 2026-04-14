/**
 * Configuration for pack-strike-team.ts.
 *
 * This file declares the include/exclude rules for producing per-assistant
 * tarballs that Assistant Strike Teams can build and test independently.
 *
 * Edit this file (not pack-strike-team.ts) when:
 *   - An assistant gains or loses a handler file
 *   - A shared folder should be included/excluded for all teams
 *   - The package.json test command drops an admin-only test suite
 */

/**
 * Explicit handler map. Keys are assistant IDs (matching custom/assistants/<id>/).
 * Values are handler file paths the team may edit as part of their assistant.
 *
 * Assistants not listed here are assumed to be pure-LLM (no handler code).
 * Tests colocated with a handler should be listed alongside it.
 */
export const ASSISTANT_HANDLER_MAP: Record<string, string[]> = {
  content_table: [
    'src/assistants/evergreens/handler.ts',
    'src/assistants/evergreens/index.ts',
    'src/assistants/evergreens/knowledge.md',
    'src/assistants/evergreens/README.md',
    'src/assistants/evergreens/evergreens.generated.ts'
  ],
  design_critique: ['src/core/assistants/handlers/designCritique.ts'],
  design_workshop: ['src/core/assistants/handlers/designWorkshop.ts'],
  discovery_copilot: ['src/core/assistants/handlers/discovery.ts'],
  analytics_tagging: ['src/core/assistants/handlers/analyticsTagging.ts'],
  errors: ['src/core/assistants/handlers/errors.ts']
}

/**
 * Top-level paths always included in every strike team tarball.
 * These are the shared plugin runtime, build infra, and read-only shared content.
 */
export const ALWAYS_INCLUDE: string[] = [
  // Plugin runtime — include whole src/ so every import resolves. Edit-ownership
  // (only-your-own handler) is enforced by STRIKE_TEAM.md and PR review, not
  // by file removal. Avoids brittle per-file allowlists that break builds when
  // new shared code is added.
  'src',
  // Shared infra
  'build',
  'vendor',
  'shared',
  // Build config
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.assistants.json',
  'manifest.json',
  'build-info.json',
  '.gitignore',
  // Shared plugin source of truth (read-only for teams except their own entry)
  'custom/config.json',
  'custom/assistants.manifest.json',
  'custom/assistants',
  'custom/knowledge',
  'custom/knowledge-bases',
  'custom/skills',
  'custom/design-systems',
  // SDK tests (teams must not break these)
  'tests/sdk',
  // Shared tests that validate plugin-wide behavior
  'tests/kb-normalization.test.ts',
  'tests/generate-knowledge-bases.test.ts',
  'tests/duplicates.test.ts',
  'tests/exclusionRules.test.ts',
  'tests/selectionResolver.test.ts',
  'tests/semanticTokenizer.test.ts',
  'tests/nearMissDetector.test.ts',
  'tests/autoAnnotator.test.ts',
  'tests/accessibility-config.test.ts'
]

/**
 * Top-level paths always excluded from every strike team tarball.
 * These are admin tools, hosted infra, and core-only scripts.
 */
export const ALWAYS_EXCLUDE: string[] = [
  'admin-editor',
  'infra',
  'deploy',
  'site',
  'enterprise',
  'refs_for_cursor',
  'node_modules',
  'dist',
  '.pack-staging',
  '.git',
  '.cursor',
  '.claude',
  '.superpowers',
  'build/build-info.json.backup',
  // Repo-level junk / unused working files
  '-t',
  '199001010000',
  'Usage',
  'monday_kanban_import.csv',
  'FigmAI_DAT.code-workspace'
]

/**
 * Scripts under scripts/ that touch hosted infra (S3, ACE, publish flow).
 * Stripped from every strike team tarball.
 */
export const EXCLUDED_SCRIPT_FILES: string[] = [
  'scripts/pull-config-from-s3.sh',
  'scripts/pull-ace-config.ts',
  'scripts/push-config.ts',
  'scripts/seed-s3.ts',
  'scripts/sync-config.ts',
  'scripts/s3-config-files.ts',
  'scripts/split-manifest.ts',
  'scripts/pack-strike-team.ts',
  'scripts/pack-strike-team.config.ts'
]

/**
 * Docs shipped with every strike team tarball.
 * Anything not listed here is considered core-internal and stays out.
 */
export const INCLUDED_DOCS: string[] = [
  'docs/README.md',
  'docs/01-getting-started.md',
  'docs/invariants.md',
  'docs/assistant-sdk.md',
  'docs/skills-and-knowledge-bases.md',
  'docs/llm-context-authoring.md',
  'docs/content-models.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md'
]

/**
 * npm scripts stripped from the tarball's package.json.
 * Hosted/admin/S3 scripts that do not apply to strike teams.
 */
export const EXCLUDED_NPM_SCRIPTS: string[] = [
  'admin',
  'admin:dev',
  'admin:proxy',
  'ace:build',
  'ace:deploy:hostgator',
  'pull:config',
  'pull-config',
  'sync-config',
  'seed-s3',
  'push-config',
  'build:with-s3',
  'build:private',
  'build:work',
  'audit:private',
  'audit:work',
  'pack-strike-team'
]

/**
 * Replacement "test" command for the tarball's package.json.
 * Drops admin-editor-specific tests and keeps plugin-relevant ones.
 */
export const PACKAGED_TEST_COMMAND =
  'tsx scripts/build-assistants.test.ts && ' +
  'tsx src/core/assistants/instructionAssembly.test.ts && ' +
  'tsx src/core/assistants/routing.regression.test.ts && ' +
  'tsx src/core/assistants/handlers/contentReview.test.ts && ' +
  'tsx src/core/knowledgeBases/resolveKb.test.ts && ' +
  'tsx tests/accessibility-config.test.ts && ' +
  'tsx tests/kb-normalization.test.ts && ' +
  'tsx tests/generate-knowledge-bases.test.ts && ' +
  'tsx tests/duplicates.test.ts && ' +
  'tsx tests/exclusionRules.test.ts && ' +
  'tsx tests/selectionResolver.test.ts && ' +
  'tsx src/core/figma/textLinkRanges.test.ts && ' +
  'tsx src/core/figma/annotations.test.ts && ' +
  'tsx src/core/contentTable/presetOrder.test.ts && ' +
  'tsx src/core/contentTable/renderers.test.ts && ' +
  'tsx tests/semanticTokenizer.test.ts && ' +
  'tsx src/core/detection/smartDetector/smartDetector.test.ts && ' +
  'tsx src/core/contentTable/projection.test.ts && ' +
  'tsx src/core/richText/reportFormat.test.ts && ' +
  'tsx src/core/richText/enhancers.test.ts && ' +
  'tsx tests/nearMissDetector.test.ts && ' +
  'tsx tests/autoAnnotator.test.ts && ' +
  'tsx tests/sdk/smartDetectionPort.test.ts && ' +
  'tsx tests/sdk/designSystemPort.test.ts && ' +
  'tsx tests/sdk/conversationManager.test.ts && ' +
  'tsx tests/sdk/statusChannel.test.ts && ' +
  'tsx tests/sdk/assistantConfig.test.ts && ' +
  'tsx tests/sdk/compileSkills.test.ts'
