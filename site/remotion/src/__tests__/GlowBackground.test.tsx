import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { GlowBackground } from '../components/GlowBackground'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
}))

import * as remotion from 'remotion'

describe('GlowBackground', () => {
  beforeEach(() => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(0)
  })

  it('renders without crashing at frame 0', () => {
    const { container } = render(<GlowBackground accent="#4a90e2" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing mid-animation (frame 45)', () => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(45)
    const { container } = render(<GlowBackground accent="#007a39" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('applies light background color', () => {
    const { container } = render(<GlowBackground accent="#e07b00" />)
    const root = container.firstChild as HTMLElement
    expect(root.style.background).toBe('rgb(248, 248, 248)')
  })
})
