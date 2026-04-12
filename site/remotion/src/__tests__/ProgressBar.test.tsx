import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '../components/ProgressBar'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  interpolate: vi.fn((val: number, input: number[], output: number[], options?: any) => {
    const t = Math.max(0, Math.min(1, (val - input[0]) / (input[input.length - 1] - input[0])))
    return output[0] + t * (output[output.length - 1] - output[0])
  }),
}))

import * as remotion from 'remotion'

describe('ProgressBar', () => {
  it('renders with 0% width at start of steps act (frame 90)', () => {
    const { container } = render(<ProgressBar accent="#4a90e2" />)
    expect(container.firstChild).toBeTruthy()
    const fill = container.querySelectorAll('div')[1] as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('renders a track and fill element', () => {
    const { container } = render(<ProgressBar accent="#007a39" />)
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders with 100% width at last frame of steps act (frame 419)', () => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(419)
    const { container } = render(<ProgressBar accent="#e07b00" />)
    const fill = container.querySelectorAll('div')[1] as HTMLElement
    expect(fill.style.width).toBe('100%')
  })
})
