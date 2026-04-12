import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoadmapCard } from '../RoadmapCard'
import { ROADMAP_ENTRIES } from '../../data/roadmap'

describe('RoadmapCard', () => {
  it('renders entry name', () => {
    const entry = ROADMAP_ENTRIES[0]
    render(<MemoryRouter><RoadmapCard entry={entry} /></MemoryRouter>)
    expect(screen.getByText(entry.name)).toBeInTheDocument()
  })

  it('applies --ac-color from entry accent', () => {
    const entry = ROADMAP_ENTRIES[1] // evergreens
    const { container } = render(<MemoryRouter><RoadmapCard entry={entry} /></MemoryRouter>)
    const card = container.firstChild as HTMLElement
    expect(card.style.getPropertyValue('--ac-color')).toBe(entry.accent)
  })

  it('live entries link to assistant page', () => {
    const live = ROADMAP_ENTRIES.find(e => e.status === 'live')!
    render(<MemoryRouter><RoadmapCard entry={live} /></MemoryRouter>)
    expect(screen.getByRole('link').getAttribute('href')).toBe(`/assistants/${live.id}`)
  })
})
