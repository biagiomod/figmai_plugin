import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Intro } from '../acts/Intro'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [{ number: 1, title: 'Step 1', description: 'Do the thing.' }],
  quickActions: ['Action 1'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Intro', () => {
  it('renders assistant name', () => {
    render(<Intro assistant={mockAssistant} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders assistant tagline', () => {
    render(<Intro assistant={mockAssistant} />)
    expect(screen.getByText('Ask me anything.')).toBeInTheDocument()
  })

  it('renders without crashing at last intro frame (89)', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(89)
    const { container } = render(<Intro assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })
})
