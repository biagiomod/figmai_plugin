import { useCurrentFrame, spring, useVideoConfig } from 'remotion'

type Props = {
  heading: string
  points: string[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function BulletList({ heading, points, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const headingSpring = spring({ fps, frame: local, config: { damping: 20 } })

  return (
    <div style={{ padding: '56px 80px', width: '100%', boxSizing: 'border-box' as const, position: 'relative' }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 32,
          opacity: headingSpring,
          transform: `translateY(${(1 - headingSpring) * 16}px)`,
        }}
      >
        {heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
        {points.map((point, i) => {
          const bulletFrame = local - 20 - i * 12
          const bSpring = spring({ fps, frame: bulletFrame, config: { damping: 18 } })
          const clamped = Math.max(0, bSpring)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                opacity: clamped,
                transform: `translateX(${(1 - clamped) * 28}px)`,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: accentColor,
                  marginTop: 9,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 19, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, fontFamily: 'inherit' }}>
                {point}
              </div>
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
