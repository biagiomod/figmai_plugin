import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Resources } from '../Resources'
import { LIVE_ASSISTANTS } from '../../data/assistants'

function renderResources() {
  return render(<MemoryRouter><Resources /></MemoryRouter>)
}

describe('Resources page', () => {
  it('renders the hero headline', () => {
    renderResources()
    expect(screen.getByText(/guides, templates/i)).toBeInTheDocument()
  })

  it('renders the Start Here strip', () => {
    renderResources()
    expect(screen.getByText(/start here/i)).toBeInTheDocument()
  })

  it('renders a video card for each live assistant', () => {
    renderResources()
    for (const a of LIVE_ASSISTANTS) {
      expect(screen.getByText(new RegExp(`${a.name}.*walkthrough`, 'i'))).toBeInTheDocument()
    }
  })

  it('renders Documentation section', () => {
    renderResources()
    expect(screen.getByText('Documentation')).toBeInTheDocument()
  })
})
