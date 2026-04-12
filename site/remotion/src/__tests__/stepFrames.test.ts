import { describe, it, expect } from 'vitest'
import { getStepIndex, getFramesPerStep, isStepExiting } from '../utils/stepFrames'

describe('getFramesPerStep', () => {
  it('divides act evenly for 4 steps', () => {
    expect(getFramesPerStep(4)).toBe(82) // floor(330/4)
  })
  it('divides act evenly for 3 steps', () => {
    expect(getFramesPerStep(3)).toBe(110) // floor(330/3)
  })
  it('divides act evenly for 5 steps (capped display at 4)', () => {
    expect(getFramesPerStep(4)).toBe(82)
  })
})

describe('getStepIndex', () => {
  it('returns 0 for localFrame 0', () => {
    expect(getStepIndex(0, 4)).toBe(0)
  })
  it('advances to next step at the right frame', () => {
    expect(getStepIndex(82, 4)).toBe(1) // frame 82 = start of step 2
  })
  it('clamps at last step', () => {
    expect(getStepIndex(329, 4)).toBe(3) // last step even at last frame
  })
})

describe('isStepExiting', () => {
  it('false before exit window', () => {
    expect(isStepExiting(0, 82, 3)).toBe(false)
  })
  it('true within exit window (last 15 frames of step)', () => {
    expect(isStepExiting(68, 82, 3)).toBe(true) // 82 - 68 = 14 frames left
  })
  it('false for last step (no next step to exit to)', () => {
    expect(isStepExiting(68, 82, 3, true)).toBe(false)
  })
})
