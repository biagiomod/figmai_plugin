import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { Clock, AlertCircle, FileQuestion } from 'lucide-react'

const ACT_START = 120
const FRAMES_PER_PAIN = 60 // 2s each, 3 = 6s total

const PAINS = [
  {
    icon: Clock,
    headline: 'Content audits that eat your sprint',
    sub: 'Manual, inconsistent, and always behind the designs.',
  },
  {
    icon: AlertCircle,
    headline: 'Accessibility issues caught in QA, not design',
    sub: 'Problems that cost 10× more to fix after handoff.',
  },
  {
    icon: FileQuestion,
    headline: 'Annotations nobody keeps up to date',
    sub: 'Specs drift the moment the designs change.',
  },
]

/**
 * Act 2 — frames 120–300 (6s)
 * Three designer pain points, each presented and replaced.
 * Red accent signals the problem; nothing is static.
 */
export function PainPoints() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  const painIndex = Math.min(Math.floor(localFrame / FRAMES_PER_PAIN), 2)
  const painLocalFrame = localFrame - painIndex * FRAMES_PER_PAIN
  const pain = PAINS[painIndex]
  const PainIcon = pain.icon

  // Red glow — oscillates subtly
  const glowOpacity = (0.04 + 0.015 * Math.sin(localFrame / 18))

  // Entry
  const enterOpacity = interpolate(painLocalFrame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const enterY = spring({ frame: painLocalFrame, fps, config: { damping: 18, stiffness: 200 }, from: 28, to: 0 })

  // Exit (only for the first two pains)
  const isExiting = painIndex < 2 && painLocalFrame > FRAMES_PER_PAIN - 14
  const exitOpacity = isExiting
    ? interpolate(painLocalFrame, [FRAMES_PER_PAIN - 14, FRAMES_PER_PAIN], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const contentOpacity = enterOpacity * exitOpacity

  // Icon pop-in
  const iconScale = spring({ frame: painLocalFrame - 8, fps, config: { damping: 12, stiffness: 240 }, from: 0.6, to: 1 })
  const iconOpacity = interpolate(painLocalFrame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Subtext
  const subOpacity = interpolate(painLocalFrame, [22, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient red glow */}
      <div style={{
        position: 'absolute',
        width: 600, height: 300,
        borderRadius: '50%',
        background: '#ff2020',
        opacity: glowOpacity,
        filter: 'blur(130px)',
        pointerEvents: 'none',
      }} />

      {/* Pain content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 28,
        opacity: contentOpacity,
        transform: `translateY(${enterY}px)`,
        padding: '0 110px',
        textAlign: 'center',
      }}>
        {/* Icon circle */}
        <div style={{
          width: 60, height: 60,
          borderRadius: '50%',
          background: 'rgba(255,60,60,0.12)',
          border: '1.5px solid rgba(255,60,60,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${iconScale})`,
          opacity: iconOpacity,
        }}>
          <PainIcon size={26} color="#ff5555" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 46,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
          maxWidth: 780,
        }}>
          {pain.headline}
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 20,
          color: 'rgba(255,255,255,0.38)',
          letterSpacing: '-0.01em',
          opacity: subOpacity,
        }}>
          {pain.sub}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ position: 'absolute', bottom: 36, display: 'flex', gap: 8, zIndex: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: i === painIndex ? 22 : 6,
            height: 6,
            borderRadius: 3,
            background: i === painIndex ? '#ff5555' : 'rgba(255,255,255,0.18)',
          }} />
        ))}
      </div>
    </div>
  )
}
