import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { ProgressBar } from '../components/ProgressBar'
import { getStepIndex, getFramesPerStep, isStepExiting } from '../utils/stepFrames'
import type { VideoAssistant } from '../data'

const ACT_START = 90

type Props = { assistant: VideoAssistant }

/**
 * Act 2 — frames 90–419 (11 seconds).
 * Shows howToUse steps one at a time, each entering from the left and
 * exiting upward before the next arrives. Progress bar crawls the top.
 * Max 4 steps shown; steps are distributed evenly across 330 frames.
 */
export const Steps: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const steps = assistant.howToUse.slice(0, 4)
  const stepCount = steps.length
  const framesPerStep = getFramesPerStep(stepCount)
  const localFrame = frame - ACT_START
  const stepIndex = getStepIndex(localFrame, stepCount)
  const stepLocalFrame = localFrame - stepIndex * framesPerStep
  const isLast = stepIndex === stepCount - 1
  const exiting = isStepExiting(stepLocalFrame, framesPerStep, stepIndex, isLast)

  const step = steps[stepIndex]

  const enterX = spring({
    frame: stepLocalFrame,
    fps,
    config: { damping: 18, stiffness: 200 },
    from: -40,
    to: 0,
  })
  const enterOpacity = interpolate(stepLocalFrame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const exitY = exiting
    ? interpolate(stepLocalFrame, [framesPerStep - 15, framesPerStep], [0, -24], {
        extrapolateRight: 'clamp',
      })
    : 0
  const exitOpacity = exiting
    ? interpolate(stepLocalFrame, [framesPerStep - 15, framesPerStep], [1, 0], {
        extrapolateRight: 'clamp',
      })
    : enterOpacity

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f0f0f0', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: assistant.accent,
          opacity: 0.08,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <ProgressBar accent={assistant.accent} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '60px 140px',
          transform: `translateX(${enterX}px) translateY(${exitY}px)`,
          opacity: exitOpacity,
        }}
      >
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: assistant.accent,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: `0 4px 20px ${assistant.accent}44`,
            }}
          >
            {step.number}
          </div>

          <div style={{ flex: 1, paddingTop: 6 }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: '#111',
                lineHeight: 1.15,
                marginBottom: 16,
                letterSpacing: '-0.02em',
              }}
            >
              {step.title}
            </div>
            <div
              style={{
                fontSize: 22,
                color: '#555',
                lineHeight: 1.6,
                maxWidth: 800,
              }}
            >
              {step.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
