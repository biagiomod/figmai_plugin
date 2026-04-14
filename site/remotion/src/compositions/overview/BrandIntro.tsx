import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { Cpu } from 'lucide-react'

const ACCENT = '#d50c7d'
const ASSISTANT_ACCENTS = ['#4a90e2', '#007a39', '#e07b00', '#8b5cf6', '#00897b']

/**
 * Act 1 — frames 0–120 (4s)
 * Brand intro: toolkit wordmark emerges from a pink glow with 5 assistant dots.
 */
export function BrandIntro() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Glow — fades in and breathes continuously
  const glowFadeOpacity = interpolate(frame, [0, 25], [0, 0.28], { extrapolateRight: 'clamp' })
  const glowBreathe = 1 + 0.06 * Math.sin(frame / 32)
  const glowOpacity = glowFadeOpacity * (0.9 + 0.1 * Math.sin(frame / 28))

  // Logo icon
  const iconScale = spring({ frame: frame - 8, fps, config: { damping: 13, stiffness: 220 }, from: 0.5, to: 1 })
  const iconOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Headline
  const headlineScale = spring({ frame: frame - 22, fps, config: { damping: 16, stiffness: 160 }, from: 0.93, to: 1 })
  const headlineOpacity = interpolate(frame, [22, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Tagline
  const taglineOpacity = interpolate(frame, [50, 68], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const taglineY = spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 140 }, from: 10, to: 0 })

  // 5 dots
  const dotsOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Breathing glow orb */}
      <div style={{
        position: 'absolute',
        width: 640, height: 640,
        borderRadius: '50%',
        background: ACCENT,
        opacity: glowOpacity,
        transform: `scale(${glowBreathe})`,
        filter: 'blur(170px)',
        pointerEvents: 'none',
      }} />

      {/* Content stack */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20,
      }}>
        {/* Toolkit icon */}
        <div style={{
          width: 68, height: 68,
          background: ACCENT,
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${iconScale})`,
          opacity: iconOpacity,
          boxShadow: `0 0 56px ${ACCENT}55`,
        }}>
          <Cpu size={32} color="#fff" strokeWidth={1.5} />
        </div>

        {/* Name */}
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          textAlign: 'center',
          transform: `scale(${headlineScale})`,
          opacity: headlineOpacity,
        }}>
          Design AI Toolkit
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 22,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '-0.01em',
          textAlign: 'center',
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}>
          Five AI assistants built for Figma designers.
        </div>

        {/* 5 assistant accent dots */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4, opacity: dotsOpacity }}>
          {ASSISTANT_ACCENTS.map((color, i) => (
            <div key={i} style={{
              width: 9, height: 9,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 10px ${color}88`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
