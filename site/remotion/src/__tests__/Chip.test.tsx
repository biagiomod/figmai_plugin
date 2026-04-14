import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chip } from '../components/Chip'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 440),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1),
}))

describe('Chip', () => {
  it('renders the label text', () => {
    render(<Chip label="Generate Table" accent="#007a39" index={0} startFrame={440} />)
    expect(screen.getByText('Generate Table')).toBeInTheDocument()
  })

  it('renders without crashing for each index 0–3', () => {
    for (let i = 0; i < 4; i++) {
      const { unmount } = render(
        <Chip label={`Action ${i}`} accent="#4a90e2" index={i} startFrame={440} />
      )
      unmount()
    }
  })

  it('is invisible (scale 0) before startFrame', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.spring).mockReturnValue(0)
    const { container } = render(
      <Chip label="Run Demo" accent="#7c3aed" index={0} startFrame={500} />
    )
    const chip = container.firstChild as HTMLElement
    expect(chip.style.transform).toBe('scale(0)')
  })
})
