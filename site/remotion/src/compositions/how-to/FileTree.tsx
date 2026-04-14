import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { TreeLine } from './types'

type Props = {
  lines: TreeLine[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function FileTree({ lines, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  return (
    <div style={{ margin: '36px 80px', position: 'relative' }}>
      <div
        style={{
          background: '#0d1117',
          borderRadius: 10,
          padding: '20px 24px',
          border: '1px solid #30363d',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.95,
        }}
      >
        {lines.map((line, i) => {
          const lineFrame = local - i * 5
          const s = spring({ fps, frame: lineFrame, config: { damping: 20 } })
          const clamped = Math.max(0, s)
          const color = line.highlight
            ? accentColor
            : line.dim
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(255,255,255,0.78)'
          const bg = line.highlight ? `${accentColor}20` : 'transparent'

          return (
            <div
              key={i}
              style={{
                opacity: clamped,
                color,
                background: bg,
                padding: line.highlight ? '1px 6px' : '0',
                borderRadius: 4,
                transform: `translateX(${(1 - clamped) * 12}px)`,
              }}
            >
              {line.text}
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
