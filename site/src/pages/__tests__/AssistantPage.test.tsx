import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AssistantPage } from '../AssistantPage'

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/assistants/${slug}`]}>
      <Routes>
        <Route path="/assistants/:slug" element={<AssistantPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AssistantPage', () => {
  it('renders General assistant name', () => {
    renderAt('general')
    expect(screen.getByRole('heading', { name: /general/i })).toBeInTheDocument()
  })

  it('renders Evergreens assistant name', () => {
    renderAt('evergreens')
    expect(screen.getByRole('heading', { name: /evergreens/i })).toBeInTheDocument()
  })

  it('renders Best Practices section only for evergreens', () => {
    renderAt('evergreens')
    expect(screen.getByText(/best practices/i)).toBeInTheDocument()
  })

  it('does not render Best Practices for non-evergreens', () => {
    renderAt('general')
    expect(screen.queryByText(/best practices/i)).not.toBeInTheDocument()
  })

  it('redirects to / for unknown slug', () => {
    renderAt('does-not-exist')
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
