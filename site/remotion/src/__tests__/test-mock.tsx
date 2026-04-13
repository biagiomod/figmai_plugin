import { describe, it, expect, vi } from 'vitest'
import { useCurrentFrame, interpolate } from 'remotion'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  interpolate: vi.fn((val: number, input: number[], output: number[], options?: any) => {
    const t = Math.max(0, Math.min(1, (val - input[0]) / (input[input.length - 1] - input[0])))
    const result = output[0] + t * (output[output.length - 1] - output[0])
    console.log('Mock interpolate called:', { val, input, output, result })
    return result
  }),
}))

describe('Mock Test', () => {
  it('calls interpolate correctly', () => {
    const result = interpolate(90, [90, 419], [0, 100])
    console.log('Direct call result:', result)
    expect(result).toBe(0)
  })
})
