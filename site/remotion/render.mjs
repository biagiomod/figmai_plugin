import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'fs'
import { execSync } from 'child_process'
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
//   node render.mjs                  → render all videos
//   node render.mjs overview         → overview only
//   node render.mjs assistants       → 5 assistant videos
//   node render.mjs strike-team      → strike-team.mp4
//   node render.mjs core-team        → core-team.mp4
const arg = process.argv[2]
const renderOverview   = !arg || arg === 'overview'
const renderAssistants = !arg || arg === 'assistants'
const renderStrikeTeam = !arg || arg === 'strike-team'
const renderCoreTeam   = !arg || arg === 'core-team'

const videosDir = path.resolve(__dirname, '..', 'public', 'videos')

function extractPoster(videoPath, posterPath) {
  try {
    execSync(`ffmpeg -y -ss 00:00:02 -i "${videoPath}" -vframes 1 -q:v 3 "${posterPath}" 2>/dev/null`)
    console.log(`  ✓ poster extracted`)
  } catch {
    console.log(`  ⚠ ffmpeg not available — skipping poster extraction`)
  }
}

async function main() {
  mkdirSync(videosDir, { recursive: true })

  console.log('Bundling Remotion compositions...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'src/Root.tsx'),
  })
  console.log('Bundle ready.\n')

  if (renderOverview) {
    const outputPath = path.resolve(videosDir, 'overview.mp4')
    process.stdout.write('  overview (40s)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'OverviewVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  overview (40s)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ overview.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'overview-poster.jpg'))
  }

  if (renderAssistants) {
    for (const id of ASSISTANT_IDS) {
      const outputPath = path.resolve(videosDir, `${id}.mp4`)
      process.stdout.write(`  ${id}...`)
      const composition = await selectComposition({ serveUrl: bundleLocation, id: 'AssistantVideo', inputProps: { assistantId: id } })
      await renderMedia({
        composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
        inputProps: { assistantId: id },
        onProgress: ({ progress }) => process.stdout.write(`\r  ${id}... ${Math.round(progress * 100)}%`),
      })
      console.log(`\r  ✓ ${id}.mp4`)
      extractPoster(outputPath, path.resolve(videosDir, `${id}-poster.jpg`))
    }
  }

  if (renderStrikeTeam) {
    const outputPath = path.resolve(videosDir, 'strike-team.mp4')
    process.stdout.write('  strike-team (7min)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'StrikeTeamVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  strike-team (7min)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ strike-team.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'strike-team-poster.jpg'))
  }

  if (renderCoreTeam) {
    const outputPath = path.resolve(videosDir, 'core-team.mp4')
    process.stdout.write('  core-team (13min)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'CoreTeamVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  core-team (13min)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ core-team.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'core-team-poster.jpg'))
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
