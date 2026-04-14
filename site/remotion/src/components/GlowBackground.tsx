import { useCurrentFrame } from 'remotion'

type Props = {
  accent: string
  /** Base opacity of the glow blob (0–1). Defaults to 0.35. */
  baseOpacity?: number
}

/**
 * Full-bleed light background (#f8f8f8) with a radial accent-color glow
 * that breathes via Math.sin — never visually static.
 */
export const GlowBackground: React.FC<Props> = ({ accent, baseOpacity = 0.35 }) => {
  const frame = useCurrentFrame()
  const glowScale = 1 + 0.08 * Math.sin(frame / 40)
  const glowOpacity = Math.max(0, baseOpacity + 0.05 * Math.sin(frame / 35))

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: accent,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          filter: 'blur(140px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
