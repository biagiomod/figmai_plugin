import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '../components/ProgressBar'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  interpolate: vi.fn((val: number, input: number[], output: number[]) => {
    const t = Math.max(0, Math.min(1, (val - input[0]) / (input[input.length - 1] - input[0])))
    return output[0] + t * (output[output.length - 1] - output[0])
  }),
}))

import * as remotion from 'remotion'

describe('ProgressBar', () => {
  it('renders without crashing at start of steps act (frame 90)', () => {
    const { container } = render(<ProgressBar accent="#4a90e2" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders a filled bar element', () => {
    const { container } = render(<ProgressBar accent="#007a39" />)
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders without crashing at last frame of steps act (frame 419)', () => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(419)
    const { container } = render(<ProgressBar accent="#e07b00" />)
    expect(container.firstChild).toBeTruthy()
  })
})
