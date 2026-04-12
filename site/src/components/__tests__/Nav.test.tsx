import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Nav } from '../Nav'

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
    </MemoryRouter>
  )
}

describe('Nav', () => {
  it('renders the logo wordmark', () => {
    renderNav()
    expect(screen.getByText('Design AI Toolkit')).toBeInTheDocument()
  })

  it('renders Roadmap and Resources links', () => {
    renderNav()
    expect(screen.getByRole('link', { name: /roadmap/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /resources/i })).toBeInTheDocument()
  })

  it('Roadmap link is active on /roadmap', () => {
    renderNav('/roadmap')
    const link = screen.getByRole('link', { name: /roadmap/i })
    expect(link.className).toMatch(/active/)
  })
})
