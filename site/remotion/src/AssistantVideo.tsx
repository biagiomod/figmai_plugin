import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { VIDEO_ASSISTANTS } from './data'
import { Intro } from './acts/Intro'
import { Steps } from './acts/Steps'
import { Closing } from './acts/Closing'

// Load Inter at module level — Remotion handles font readiness automatically
const { fontFamily } = loadFont('normal')

type Props = { assistantId: string }

/**
 * Top-level 1280×720 composition.
 * Routes to Intro (0–89), Steps (90–419), or Closing (420–539) based on current frame.
 */
export function AssistantVideo({ assistantId }: Props) {
  const frame = useCurrentFrame()
  const assistant = VIDEO_ASSISTANTS.find(a => a.id === assistantId)

  if (!assistant) {
    throw new Error(`AssistantVideo: unknown assistantId "${assistantId}"`)
  }

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        position: 'relative',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      {frame < 90 && <Intro assistant={assistant} />}
      {frame >= 90 && frame < 420 && <Steps assistant={assistant} />}
      {frame >= 420 && <Closing assistant={assistant} />}
    </div>
  )
}
