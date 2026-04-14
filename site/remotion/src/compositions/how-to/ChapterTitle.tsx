import { useCurrentFrame, spring, useVideoConfig } from 'remotion'

type Props = {
  chapterNum: number
  totalChapters: number
  title: string
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function ChapterTitle({
  chapterNum,
  totalChapters,
  title,
  accentColor,
  startFrame,
  globalProgress,
}: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const opacity = spring({ fps, frame: local, config: { damping: 20 } })
  const scale = Math.max(0.92, Math.min(1, 0.92 + 0.08 * spring({ fps, frame: local, config: { damping: 15 } })))
  const glow = 0.1 + 0.05 * Math.sin(local / 20)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 260,
          borderRadius: '50%',
          background: accentColor,
          filter: 'blur(110px)',
          opacity: glow,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
      {/* Content */}
      <div style={{ transform: `scale(${scale})`, textAlign: 'center', position: 'relative', padding: '0 80px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color: accentColor,
            marginBottom: 14,
          }}
        >
          Chapter {chapterNum} of {totalChapters}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.025em',
            lineHeight: 1.08,
          }}
        >
          {title}
        </div>
      </div>
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            height: 3,
            background: accentColor,
            width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
