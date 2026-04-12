import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { GlowBackground } from '../components/GlowBackground'
import { Chip } from '../components/Chip'
import type { VideoAssistant } from '../data'

const ACT_START = 420
const CHIP_SPRING_START = ACT_START + 20   // absolute frame 440
const NAME_FADE_START = ACT_START + 40     // absolute frame 460
const CTA_FADE_START = ACT_START + 70      // absolute frame 490

type Props = { assistant: VideoAssistant }

/**
 * Act 3 — frames 420–539 (4 seconds).
 * Returns to the glow background. Quick-action chips spring in staggered,
 * then assistant name fades in, then CTA. Glow continues to pulse — never static.
 */
export const Closing: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  const chips = assistant.quickActions.slice(0, 4)

  const bgOpacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  })

  const nameY = spring({
    frame: frame - NAME_FADE_START,
    fps,
    config: { damping: 16, stiffness: 160 },
    from: 20,
    to: 0,
  })
  const nameOpacity = interpolate(frame, [NAME_FADE_START, NAME_FADE_START + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const ctaOpacity = interpolate(frame, [CTA_FADE_START, CTA_FADE_START + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: bgOpacity }}>
      <GlowBackground accent={assistant.accent} baseOpacity={0.32} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          zIndex: 1,
          padding: '0 120px',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#111',
            letterSpacing: '-0.03em',
            transform: `translateY(${nameY}px)`,
            opacity: nameOpacity,
          }}
        >
          {assistant.name}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {chips.map((action, i) => (
            <Chip
              key={action}
              label={action}
              accent={assistant.accent}
              index={i}
              startFrame={CHIP_SPRING_START}
            />
          ))}
        </div>

        <div
          style={{
            fontSize: 16,
            color: '#999',
            opacity: ctaOpacity,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Open in Figma
        </div>
      </div>
    </div>
  )
}
