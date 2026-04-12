import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { GlowBackground } from '../components/GlowBackground'
import type { VideoAssistant } from '../data'

type Props = { assistant: VideoAssistant }

/**
 * Act 1 — frames 0–89 (3 seconds).
 * Establishes assistant identity: glow background, icon spring, name, tagline.
 * Nothing holds static — glow pulses continuously.
 */
export const Intro: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const Icon = assistant.icon

  const glowOpacity = interpolate(frame, [0, 30], [0, 0.38], {
    extrapolateRight: 'clamp',
  })

  const iconScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 180 },
    from: 0.6,
    to: 1,
  })
  const iconOpacity = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const nameY = spring({
    frame: frame - 20,
    fps,
    config: { damping: 16, stiffness: 160 },
    from: 20,
    to: 0,
  })
  const nameOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const taglineY = spring({
    frame: frame - 36,
    fps,
    config: { damping: 18, stiffness: 140 },
    from: 10,
    to: 0,
  })
  const taglineOpacity = interpolate(frame, [36, 56], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GlowBackground accent={assistant.accent} baseOpacity={glowOpacity} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          zIndex: 1,
          padding: '0 120px',
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            background: assistant.accent,
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${iconScale})`,
            opacity: iconOpacity,
            boxShadow: `0 8px 32px ${assistant.accent}44`,
          }}
        >
          <Icon size={44} color="#fff" strokeWidth={1.8} />
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#111',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            transform: `translateY(${nameY}px)`,
            opacity: nameOpacity,
          }}
        >
          {assistant.name}
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#555',
            maxWidth: 720,
            textAlign: 'center',
            lineHeight: 1.55,
            transform: `translateY(${taglineY}px)`,
            opacity: taglineOpacity,
          }}
        >
          {assistant.tagline}
        </div>
      </div>
    </div>
  )
}
