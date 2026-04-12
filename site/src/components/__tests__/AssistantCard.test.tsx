import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AssistantCard } from '../AssistantCard'
import { ASSISTANTS } from '../../data/assistants'

describe('AssistantCard', () => {
  it('renders assistant name', () => {
    const a = ASSISTANTS[0]
    render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    expect(screen.getByText(a.name)).toBeInTheDocument()
  })

  it('applies --ac-color CSS variable from accent', () => {
    const a = ASSISTANTS[1] // evergreens, #007a39
    const { container } = render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    const card = container.firstChild as HTMLElement
    expect(card.style.getPropertyValue('--ac-color')).toBe('#007a39')
  })

  it('renders a link to the assistant page', () => {
    const a = ASSISTANTS[0]
    render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(`/assistants/${a.id}`)
  })
})
