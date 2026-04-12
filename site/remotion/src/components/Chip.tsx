import { useCurrentFrame, useVideoConfig, spring } from 'remotion'

type Props = {
  label: string
  accent: string
  /** Zero-based index — used to stagger the spring entrance. */
  index: number
  /** Absolute frame (in the full video) when the first chip should begin springing in. */
  startFrame: number
}

/**
 * Quick-action pill that springs in with a staggered delay per index.
 * Each chip is delayed by index * 8 frames from startFrame.
 */
export const Chip: React.FC<Props> = ({ label, accent, index, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const delay = index * 8

  const scale = spring({
    frame: frame - startFrame - delay,
    fps,
    config: { damping: 14, stiffness: 220 },
    from: 0,
    to: 1,
  })

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '10px 22px',
        borderRadius: 999,
        border: `2px solid ${accent}`,
        background: '#fff',
        color: accent,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '0.01em',
        transform: `scale(${scale})`,
        opacity: scale,
        boxShadow: `0 2px 12px ${accent}22`,
      }}
    >
      {label}
    </div>
  )
}
