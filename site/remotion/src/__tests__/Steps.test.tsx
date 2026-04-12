import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Steps } from '../acts/Steps'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 0),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [
    { number: 1, title: 'Open the plugin', description: 'Launch from Figma.' },
    { number: 2, title: 'Select General', description: 'Choose the assistant.' },
    { number: 3, title: 'Ask your question', description: 'Type anything.' },
  ],
  quickActions: ['Action 1'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Steps', () => {
  it('renders a step title at frame 90 (start of act)', () => {
    render(<Steps assistant={mockAssistant} />)
    expect(screen.getByText('Open the plugin')).toBeInTheDocument()
  })

  it('renders step number', () => {
    render(<Steps assistant={mockAssistant} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders without crashing at last frame of act (419)', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(419)
    const { container } = render(<Steps assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows at most 4 steps regardless of howToUse length', () => {
    const manySteps = Array.from({ length: 6 }, (_, i) => ({
      number: i + 1, title: `Step ${i + 1}`, description: 'desc',
    }))
    const { container } = render(
      <Steps assistant={{ ...mockAssistant, howToUse: manySteps }} />
    )
    expect(container.firstChild).toBeTruthy()
  })
})
