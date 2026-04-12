import { useCurrentFrame, interpolate } from 'remotion'

type Props = { accent: string }

/**
 * Thin accent-color bar pinned to the top of the frame.
 * Width crawls from 0% → 100% across the full steps act (frames 90–419).
 * Always visible during Act 2, keeping the screen alive.
 */
export const ProgressBar: React.FC<Props> = ({ accent }) => {
  const frame = useCurrentFrame()
  const widthPct = interpolate(frame, [90, 419], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'rgba(0,0,0,0.08)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${widthPct}%`,
          background: accent,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
