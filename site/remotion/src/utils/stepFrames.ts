/** Total frames available for the steps act (frames 90–419). */
export const STEPS_ACT_DURATION = 330

/** Frames allocated per step based on how many steps are shown (max 4). */
export function getFramesPerStep(stepCount: number): number {
  return Math.floor(STEPS_ACT_DURATION / stepCount)
}

/**
 * Which step index is active at `localFrame` (frame within the steps act, 0-based).
 * Clamps to the last step so the final step holds until the act ends.
 */
export function getStepIndex(localFrame: number, stepCount: number): number {
  const framesPerStep = getFramesPerStep(stepCount)
  return Math.min(Math.floor(localFrame / framesPerStep), stepCount - 1)
}

/**
 * Whether the current step should be playing its exit animation.
 * The exit window starts 15 frames before the next step begins.
 * Always false for the last step (nothing to exit to).
 */
export function isStepExiting(
  stepLocalFrame: number,
  framesPerStep: number,
  stepIndex: number,
  isLastStep = false,
): boolean {
  if (isLastStep) return false
  return stepLocalFrame >= framesPerStep - 15
}
