import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Roadmap } from '../Roadmap'

function renderRoadmap() {
  return render(<MemoryRouter><Roadmap /></MemoryRouter>)
}

describe('Roadmap page', () => {
  it('renders Live column heading', () => {
    renderRoadmap()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('renders Backlog column heading', () => {
    renderRoadmap()
    expect(screen.getByText('Backlog')).toBeInTheDocument()
  })

  it('shows all live assistant names by default', () => {
    renderRoadmap()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Evergreens')).toBeInTheDocument()
  })

  it('filter pill hides Backlog column when toggled off', () => {
    renderRoadmap()
    const backlogPill = screen.getByRole('button', { name: /backlog/i })
    fireEvent.click(backlogPill)
    expect(screen.queryByText('Copywriting')).not.toBeInTheDocument()
  })
})
