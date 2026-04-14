import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Closing } from '../acts/Closing'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 460),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [{ number: 1, title: 'Step 1', description: 'Do the thing.' }],
  quickActions: ['Explain this design', 'Design suggestions', 'Run Smart Detector'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Closing', () => {
  it('renders assistant name', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders quick action chips (up to 4)', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('Explain this design')).toBeInTheDocument()
    expect(screen.getByText('Design suggestions')).toBeInTheDocument()
    expect(screen.getByText('Run Smart Detector')).toBeInTheDocument()
  })

  it('renders "Open in Figma" CTA', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('Open in Figma')).toBeInTheDocument()
  })

  it('renders without crashing at act start (frame 420)', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(420)
    const { container } = render(<Closing assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })
})
