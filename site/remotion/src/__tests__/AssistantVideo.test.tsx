import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  for (const id of ASSISTANT_IDS) {
    it(`renders without crashing for assistantId="${id}" at frame 0 (Intro)`, () => {
      const { container } = render(<AssistantVideo assistantId={id} />)
      expect(container.firstChild).toBeTruthy()
    })
  }

  it('renders Steps act at frame 90 (shows step content, not tagline)', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(90)
    render(<AssistantVideo assistantId="general" />)
    // Steps renders the step title from howToUse; Intro would render the tagline instead
    expect(screen.getByText('Open the plugin in Figma')).toBeInTheDocument()
  })

  it('renders Closing act at frame 420 (shows CTA)', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(420)
    render(<AssistantVideo assistantId="evergreens" />)
    // Closing renders the "Open in Figma" CTA; Steps and Intro do not
    expect(screen.getByText('Open in Figma')).toBeInTheDocument()
  })
})
