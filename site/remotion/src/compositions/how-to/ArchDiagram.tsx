import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { ArchBox, ArchConnection } from './types'

type Props = {
  boxes: ArchBox[]
  connections: ArchConnection[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function ArchDiagram({ boxes, connections, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const connStart = boxes.length * 12 + 10

  return (
    <div style={{ padding: '40px 80px', position: 'relative' }}>
      {/* Boxes */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: 16,
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {boxes.map((box, i) => {
          const s = spring({ fps, frame: local - i * 12, config: { damping: 18 } })
          const clamped = Math.max(0, s)
          return (
            <div
              key={box.id}
              style={{
                background: `${box.color}18`,
                border: `1px solid ${box.color}55`,
                borderRadius: 10,
                padding: '18px 22px',
                minWidth: 155,
                opacity: clamped,
                transform: `translateY(${(1 - clamped) * 18}px)`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: box.color, marginBottom: 4 }}>{box.label}</div>
              {box.sublabel && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{box.sublabel}</div>
              )}
            </div>
          )
        })}
      </div>
      {/* Connection labels */}
      {connections.map((conn, i) => {
        const connFrame = local - connStart - i * 8
        const s = spring({ fps, frame: connFrame, config: { damping: 20 } })
        const clamped = Math.max(0, s)
        if (!conn.label) return null
        return (
          <div
            key={i}
            style={{
              textAlign: 'center' as const,
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              opacity: clamped,
              marginTop: 4,
            }}
          >
            {conn.label}
          </div>
        )
      })}
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
