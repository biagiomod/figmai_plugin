import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ASSISTANT_IDS = [
  'general',
  'evergreens',
  'accessibility',
  'design-workshop',
  'analytics-tagging',
]

// CLI usage:
//   node render.mjs            → render overview + all 5 assistants
//   node render.mjs overview   → render only the overview video
//   node render.mjs assistants → render only the 5 assistant videos
const arg = process.argv[2]
const renderOverview  = !arg || arg === 'overview'
const renderAssistants = !arg || arg === 'assistants'

async function main() {
  mkdirSync(path.resolve(__dirname, '..', 'public', 'videos'), { recursive: true })

  console.log('Bundling Remotion compositions...')

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'src/Root.tsx'),
  })

  console.log('Bundle ready.\n')

  if (renderOverview) {
    const outputPath = path.resolve(__dirname, '..', 'public', 'videos', 'overview.mp4')
    process.stdout.write('  overview (40s)...')

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'OverviewVideo',
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  overview (40s)... ${Math.round(progress * 100)}%`)
      },
    })

    console.log('\r  ✓ overview.mp4')
  }

  if (renderAssistants) {
    for (const id of ASSISTANT_IDS) {
      const outputPath = path.resolve(__dirname, '..', 'public', 'videos', `${id}.mp4`)
      process.stdout.write(`  ${id}...`)

      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'AssistantVideo',
        inputProps: { assistantId: id },
      })

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: { assistantId: id },
        onProgress: ({ progress }) => {
          process.stdout.write(`\r  ${id}... ${Math.round(progress * 100)}%`)
        },
      })

      console.log(`\r  ✓ ${id}.mp4`)
    }
  }

  console.log('\nAll videos rendered.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
