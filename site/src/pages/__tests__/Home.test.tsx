import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '../Home'
import { LIVE_ASSISTANTS } from '../../data/assistants'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

describe('Home page', () => {
  it('renders all 5 assistant cards', () => {
    renderHome()
    for (const a of LIVE_ASSISTANTS) {
      expect(screen.getByText(a.name)).toBeInTheDocument()
    }
  })

  it('renders the hero headline', () => {
    renderHome()
    expect(screen.getByText(/design moves fast/i)).toBeInTheDocument()
  })

  it('renders the Strike Teams section headline', () => {
    renderHome()
    expect(screen.getByText(/build the tools/i)).toBeInTheDocument()
  })

  it('renders the Explore Assistants CTA', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /explore assistants/i })).toBeInTheDocument()
  })
})
