import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { VIDEO_ASSISTANTS } from '../../data'

const ACT_START = 300
const FRAMES_PER_ASSISTANT = 120 // 4s each × 5 = 20s

const BENEFITS = [
  'Ask anything about your design.',
  'Content inventory in seconds.',
  'WCAG compliance, instantly.',
  'Describe it. Watch it build.',
  'Every annotation, automated.',
]

/**
 * Act 3 — frames 300–900 (20s)
 * All five assistants presented sequentially. Each gets 4 seconds:
 * icon spring → name slide → benefit text → hold with glow pulse.
 * A progress bar tracks the full act at the bottom.
 */
export function AssistantShowcase() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  const aIndex = Math.min(Math.floor(localFrame / FRAMES_PER_ASSISTANT), 4)
  const aLocalFrame = localFrame - aIndex * FRAMES_PER_ASSISTANT
  const assistant = VIDEO_ASSISTANTS[aIndex]
  const Icon = assistant.icon
  const benefit = BENEFITS[aIndex]

  // Cross-fade envelope
  const fadeIn = interpolate(aLocalFrame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = aIndex < 4
    ? interpolate(aLocalFrame, [FRAMES_PER_ASSISTANT - 12, FRAMES_PER_ASSISTANT], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const contentOpacity = fadeIn * fadeOut

  // Glow orb
  const glowFadeIn = interpolate(aLocalFrame, [0, 20], [0, 0.26], { extrapolateRight: 'clamp' })
  const glowBreathe = 1 + 0.05 * Math.sin(aLocalFrame / 26)
  const glowOpacity = glowFadeIn * (aIndex < 4 ? fadeOut : 1)

  // Icon
  const iconScale = spring({ frame: aLocalFrame - 10, fps, config: { damping: 13, stiffness: 210 }, from: 0.55, to: 1 })
  const iconOpacity = interpolate(aLocalFrame, [10, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Name
  const nameY = spring({ frame: aLocalFrame - 24, fps, config: { damping: 16, stiffness: 160 }, from: 18, to: 0 })
  const nameOpacity = interpolate(aLocalFrame, [24, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Benefit
  const benefitY = spring({ frame: aLocalFrame - 44, fps, config: { damping: 20, stiffness: 140 }, from: 10, to: 0 })
  const benefitOpacity = interpolate(aLocalFrame, [44, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Overall progress bar (across all 5 assistants)
  const totalFrames = 5 * FRAMES_PER_ASSISTANT
  const progressPct = (localFrame / totalFrames) * 100

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a' }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        width: 640, height: 640,
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${glowBreathe})`,
        borderRadius: '50%',
        background: assistant.accent,
        opacity: glowOpacity,
        filter: 'blur(160px)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24, zIndex: 1,
        opacity: contentOpacity,
      }}>
        {/* Icon */}
        <div style={{
          width: 100, height: 100,
          background: assistant.accent,
          borderRadius: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${iconScale})`,
          opacity: iconOpacity,
          boxShadow: `0 16px 56px ${assistant.accent}55`,
        }}>
          <Icon size={50} color="#fff" strokeWidth={1.5} />
        </div>

        {/* Name */}
        <div style={{
          fontSize: 76,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          transform: `translateY(${nameY}px)`,
          opacity: nameOpacity,
        }}>
          {assistant.name}
        </div>

        {/* Benefit */}
        <div style={{
          fontSize: 26,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.01em',
          transform: `translateY(${benefitY}px)`,
          opacity: benefitOpacity,
        }}>
          {benefit}
        </div>
      </div>

      {/* Bottom: progress bar + dot indicators */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)', zIndex: 10 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: assistant.accent }} />
      </div>

      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
        {VIDEO_ASSISTANTS.map((a, i) => (
          <div key={a.id} style={{
            width: i === aIndex ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i < aIndex ? a.accent : i === aIndex ? a.accent : 'rgba(255,255,255,0.15)',
            opacity: i < aIndex ? 0.45 : 1,
          }} />
        ))}
      </div>
    </div>
  )
}
