import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { Cpu } from 'lucide-react'
import { VIDEO_ASSISTANTS } from '../../data'

const ACT_START = 1080
const ACCENT = '#d50c7d'

/**
 * Act 5 — frames 1080–1200 (4s)
 * Brand lockup with CTA and all 5 assistant icons fanned below.
 * Glow breathes — the last frame is never static.
 */
export function CtaClose() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  // Glow
  const glowOpacity = interpolate(localFrame, [0, 28], [0, 0.32], { extrapolateRight: 'clamp' })
    * (0.88 + 0.12 * Math.sin(localFrame / 30))
  const glowScale = 1 + 0.055 * Math.sin(localFrame / 28)

  // Logo icon
  const iconScale = spring({ frame: localFrame - 0, fps, config: { damping: 13, stiffness: 200 }, from: 0.6, to: 1 })
  const iconOpacity = interpolate(localFrame, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Headline
  const headlineOpacity = interpolate(localFrame, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const headlineScale = spring({ frame: localFrame - 12, fps, config: { damping: 16, stiffness: 160 }, from: 0.93, to: 1 })

  // Tagline
  const taglineOpacity = interpolate(localFrame, [28, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const taglineY = spring({ frame: localFrame - 28, fps, config: { damping: 20, stiffness: 140 }, from: 8, to: 0 })

  // CTA pill
  const ctaOpacity = interpolate(localFrame, [48, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const ctaScale = spring({ frame: localFrame - 48, fps, config: { damping: 14, stiffness: 200 }, from: 0.88, to: 1 })

  // Assistant icons
  const iconsOpacity = interpolate(localFrame, [68, 88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Breathing glow */}
      <div style={{
        position: 'absolute',
        width: 720, height: 720,
        borderRadius: '50%',
        background: ACCENT,
        opacity: glowOpacity,
        transform: `scale(${glowScale})`,
        filter: 'blur(180px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* Toolkit icon */}
        <div style={{
          width: 72, height: 72,
          background: ACCENT, borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 60px ${ACCENT}66`,
          opacity: iconOpacity,
          transform: `scale(${iconScale})`,
        }}>
          <Cpu size={34} color="#fff" strokeWidth={1.5} />
        </div>

        {/* Name */}
        <div style={{
          fontSize: 76, fontWeight: 800,
          color: '#fff', letterSpacing: '-0.03em',
          lineHeight: 1, textAlign: 'center',
          opacity: headlineOpacity,
          transform: `scale(${headlineScale})`,
        }}>
          Design AI Toolkit
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 23,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '-0.01em',
          textAlign: 'center',
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}>
          Five assistants. Zero headaches.
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 6,
          padding: '14px 36px',
          background: ACCENT, borderRadius: 999,
          fontSize: 19, fontWeight: 700, color: '#fff',
          letterSpacing: '-0.01em',
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          boxShadow: `0 6px 30px ${ACCENT}55`,
        }}>
          Open in Figma →
        </div>

        {/* 5 assistant icons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6, opacity: iconsOpacity }}>
          {VIDEO_ASSISTANTS.map(a => {
            const Icon = a.icon
            return (
              <div key={a.id} style={{
                width: 34, height: 34, borderRadius: 9,
                background: a.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 14px ${a.accent}44`,
              }}>
                <Icon size={17} color="#fff" strokeWidth={2} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
