import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AssistantVideo } from '../AssistantVideo'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1280, height: 720, durationInFrames: 540 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
  Composition: () => null,
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

const ASSISTANT_IDS = ['general', 'evergreens', 'accessibility', 'design-workshop', 'analytics-tagging']

describe('AssistantVideo', () => {
  for (const id of ASSISTANT_IDS) {
    it(`renders without crashing for assistantId="${id}" at frame 0 (Intro)`, () => {
      const { container } = render(<AssistantVideo assistantId={id} />)
      expect(container.firstChild).toBeTruthy()
    })
  }

  it('renders Steps act at frame 90', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(90)
    const { container } = render(<AssistantVideo assistantId="general" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders Closing act at frame 420', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(420)
    const { container } = render(<AssistantVideo assistantId="evergreens" />)
    expect(container.firstChild).toBeTruthy()
  })
})
