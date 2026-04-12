import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
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

async function main() {
  console.log('Bundling Remotion composition...')

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'src/Root.tsx'),
  })

  console.log('Bundle ready. Rendering 5 assistants...\n')

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

  console.log('\nAll videos rendered.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
