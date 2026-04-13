import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StrikeTeamVideo } from '../compositions/StrikeTeamVideo'
import { STRIKE_TEAM_SCRIPT } from '../../scripts/strike-team-script'
import { buildTimeline } from '../compositions/how-to/buildTimeline'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1280, height: 720, durationInFrames: 12600 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

vi.mock('../compositions/how-to/ChapterTitle', () => ({
  ChapterTitle: ({ title }: { title: string }) => (
    <div data-testid="chapter-title">{title}</div>
  ),
}))
vi.mock('../compositions/how-to/BulletList', () => ({
  BulletList: ({ heading }: { heading: string }) => (
    <div data-testid="bullet-list">{heading}</div>
  ),
}))
vi.mock('../compositions/how-to/Terminal', () => ({
  Terminal: () => <div data-testid="terminal" />,
}))
vi.mock('../compositions/how-to/FileTree', () => ({
  FileTree: () => <div data-testid="filetree" />,
}))
vi.mock('../compositions/how-to/FlowDiagram', () => ({
  FlowDiagram: () => <div data-testid="flow" />,
}))
vi.mock('../compositions/how-to/ArchDiagram', () => ({
  ArchDiagram: () => <div data-testid="arch" />,
}))

describe('StrikeTeamVideo', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('renders without crashing at frame 0', () => {
    const { container } = render(<StrikeTeamVideo />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows chapter 1 title at frame 0', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(0)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent("Welcome & What You're Building")
  })

  it('shows chapter 2 title at the start of chapter 2', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const ch2Start = tl.find(t => t.chapterIdx === 1 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch2Start)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('Get Set Up')
  })

  it('shows a scene (not chapter title) after the chapter 1 title frames end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const firstScene = tl.find(t => t.chapterIdx === 0 && !t.isTitle)!
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(firstScene.startFrame)
    render(<StrikeTeamVideo />)
    expect(screen.queryByTestId('chapter-title')).toBeNull()
  })

  it('shows chapter 6 title near the end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const ch6Start = tl.find(t => t.chapterIdx === 5 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch6Start)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('ACE Admin')
  })
})
