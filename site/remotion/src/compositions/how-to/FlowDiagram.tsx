import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import type { FlowNode, FlowArrow } from './types'

type Props = {
  nodes: FlowNode[]
  arrows: FlowArrow[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

const NODE_STAGGER = 14
const ARROW_START_OFFSET = 10

export function FlowDiagram({ nodes, arrows, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const arrowsStart = nodes.length * NODE_STAGGER + ARROW_START_OFFSET

  return (
    <div style={{ padding: '40px 80px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap' as const,
          gap: 0,
        }}
      >
        {nodes.map((node, i) => {
          const nodeFrame = local - i * NODE_STAGGER
          const s = spring({ fps, frame: nodeFrame, config: { damping: 18 } })
          const clamped = Math.max(0, s)
          const isLast = i === nodes.length - 1

          // Find arrow for this gap
          const arrow = arrows.find(a => a.from === node.id)
          const arrowFrame = local - arrowsStart - i * 10
          const arrowProgress = interpolate(arrowFrame, [0, 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          return (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${accentColor}55`,
                  borderRadius: 8,
                  padding: '11px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap' as const,
                  opacity: clamped,
                  transform: `scale(${0.9 + 0.1 * clamped})`,
                }}
              >
                {node.label}
              </div>
              {!isLast && arrow && (
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 6px' }}>
                  <div
                    style={{
                      height: 2,
                      background: accentColor,
                      width: `${arrowProgress * 36}px`,
                    }}
                  />
                  {arrowProgress > 0.85 && (
                    <div style={{ color: accentColor, fontSize: 18, marginLeft: -2, lineHeight: 1 }}>›</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
