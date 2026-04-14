import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { Zap, Target, Lightbulb } from 'lucide-react'

const ACT_START = 900
const ACCENT = '#d50c7d'

const ITEMS = [
  {
    icon: Zap,
    label: 'Move faster',
    body: 'Compress documentation, annotation, and research cycles from days to minutes.',
  },
  {
    icon: Target,
    label: 'Ship tighter',
    body: 'Catch accessibility and consistency issues in design, not in development.',
  },
  {
    icon: Lightbulb,
    label: 'Decide confidently',
    body: 'Better context and real-time guidance at every design decision.',
  },
]

/**
 * Act 4 — frames 900–1080 (6s)
 * Three benefit cards stagger in on a dark background with brand pink glow.
 * Nothing holds fully static — glow breathes throughout.
 */
export function Benefits() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  // Glow
  const glowOpacity = interpolate(localFrame, [0, 30], [0, 0.22], { extrapolateRight: 'clamp' })
    * (0.9 + 0.1 * Math.sin(localFrame / 28))

  // Eyebrow label
  const eyebrowOpacity = interpolate(localFrame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: 800, height: 400,
        borderRadius: '50%',
        background: ACCENT,
        opacity: glowOpacity,
        filter: 'blur(170px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        {/* Eyebrow */}
        <div style={{
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: ACCENT, opacity: eyebrowOpacity,
        }}>
          Why it works
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', gap: 24 }}>
          {ITEMS.map(({ icon: Icon, label, body }, i) => {
            const delay = i * 16
            const cardOpacity = interpolate(localFrame, [delay, delay + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const cardY = spring({ frame: localFrame - delay, fps, config: { damping: 18, stiffness: 160 }, from: 26, to: 0 })

            return (
              <div key={label} style={{
                width: 310,
                display: 'flex', flexDirection: 'column', gap: 18,
                padding: '28px 26px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                opacity: cardOpacity,
                transform: `translateY(${cardY}px)`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: ACCENT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color="#fff" />
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 800,
                  color: '#fff', letterSpacing: '-0.02em',
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.48)',
                  lineHeight: 1.6,
                }}>
                  {body}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
