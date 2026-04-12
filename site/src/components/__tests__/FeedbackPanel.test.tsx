import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedbackPanel } from '../FeedbackPanel'

describe('FeedbackPanel', () => {
  it('renders Report a Bug panel', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    expect(screen.getByText(/report a bug/i)).toBeInTheDocument()
  })

  it('renders Request a Change panel', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    expect(screen.getByText(/request a change/i)).toBeInTheDocument()
  })

  it('bug link has correct href', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    const link = screen.getByRole('link', { name: /report a bug/i })
    expect(link.getAttribute('href')).toBe('https://jira.example.com/bug')
  })

  it('renders as links, not form submit buttons', () => {
    render(<FeedbackPanel bugHref="#" changeHref="#" />)
    const buttons = screen.queryAllByRole('button', { name: /submit/i })
    expect(buttons).toHaveLength(0)
  })
})
