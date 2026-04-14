import { useCurrentFrame } from 'remotion'
import type { TerminalCommand } from './types'

type Props = {
  commands: TerminalCommand[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

const CHARS_PER_FRAME = 8
const OUTPUT_DELAY = 35   // frames after cmd finishes before output appears
const CMD_GAP = 20        // extra frames of pause between commands

export function Terminal({ commands, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const local = frame - startFrame

  // Calculate when each command starts
  const cmdStarts: number[] = []
  let t = 0
  for (const cmd of commands) {
    cmdStarts.push(t)
    const typingFrames = Math.ceil(cmd.cmd.length / CHARS_PER_FRAME)
    const outputFrames = cmd.output ? OUTPUT_DELAY + cmd.output.length * 8 : OUTPUT_DELAY
    t += typingFrames + outputFrames + CMD_GAP
  }

  const showCursor = local % 28 < 14

  return (
    <div style={{ margin: '36px 80px', position: 'relative' }}>
      <div
        style={{
          background: '#0d1117',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #30363d',
          fontFamily: "'Fira Code', 'Courier New', monospace",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#161b22',
            borderBottom: '1px solid #30363d',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        </div>
        {/* Content */}
        <div style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.85 }}>
          {commands.map((cmd, i) => {
            const cmdStart = cmdStarts[i]
            if (local < cmdStart) return null
            const localCmd = local - cmdStart
            const typingFrames = Math.ceil(cmd.cmd.length / CHARS_PER_FRAME)
            const charsToShow = Math.min(cmd.cmd.length, Math.floor(localCmd * CHARS_PER_FRAME))
            const isTyping = charsToShow < cmd.cmd.length
            const showOutput = localCmd > typingFrames + OUTPUT_DELAY

            return (
              <div key={i} style={{ marginBottom: i < commands.length - 1 ? 8 : 0 }}>
                <div>
                  <span style={{ color: '#6c7086' }}>$ </span>
                  <span style={{ color: '#a6e3a1' }}>{cmd.cmd.slice(0, charsToShow)}</span>
                  {isTyping && showCursor && <span style={{ color: accentColor }}>▌</span>}
                </div>
                {showOutput && cmd.output?.map((line, j) => {
                  const lineDelay = j * 8
                  if (localCmd < typingFrames + OUTPUT_DELAY + lineDelay) return null
                  return (
                    <div key={j} style={{ color: 'rgba(255,255,255,0.45)', paddingLeft: 14, fontSize: 13 }}>
                      {line}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
