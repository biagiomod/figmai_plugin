import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { STRIKE_TEAM_SCRIPT } from '../../scripts/strike-team-script'
import { buildTimeline } from './how-to/buildTimeline'
import { ChapterTitle } from './how-to/ChapterTitle'
import { BulletList } from './how-to/BulletList'
import { Terminal } from './how-to/Terminal'
import { FileTree } from './how-to/FileTree'
import { FlowDiagram } from './how-to/FlowDiagram'
import type { Scene } from './how-to/types'

const { fontFamily } = loadFont('normal')

const TIMELINE = buildTimeline(STRIKE_TEAM_SCRIPT)
const TOTAL_FRAMES = TIMELINE[TIMELINE.length - 1].endFrame

function SceneRenderer({
  scene,
  accentColor,
  startFrame,
  globalProgress,
}: {
  scene: Scene
  accentColor: string
  startFrame: number
  globalProgress: number
}) {
  const sharedProps = { accentColor, startFrame, globalProgress }
  switch (scene.type) {
    case 'bullets':
      return <BulletList heading={scene.heading} points={scene.points} {...sharedProps} />
    case 'terminal':
      return <Terminal commands={scene.commands} {...sharedProps} />
    case 'filetree':
      return <FileTree lines={scene.lines} {...sharedProps} />
    case 'flow':
      return <FlowDiagram nodes={scene.nodes} arrows={scene.arrows} {...sharedProps} />
    default:
      return null
  }
}

export function StrikeTeamVideo() {
  const frame = useCurrentFrame()
  const globalProgress = frame / TOTAL_FRAMES
  const entry = TIMELINE.find(t => frame >= t.startFrame && frame < t.endFrame)
    ?? TIMELINE[TIMELINE.length - 1]
  const chapter = STRIKE_TEAM_SCRIPT.chapters[entry.chapterIdx]
  const { accentColor } = STRIKE_TEAM_SCRIPT

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        background: '#0a0a0a',
        fontFamily,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {entry.isTitle ? (
        <ChapterTitle
          chapterNum={entry.chapterIdx + 1}
          totalChapters={STRIKE_TEAM_SCRIPT.chapters.length}
          title={chapter.title}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      ) : (
        <SceneRenderer
          scene={chapter.scenes[entry.sceneIdx]}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      )}
    </div>
  )
}
