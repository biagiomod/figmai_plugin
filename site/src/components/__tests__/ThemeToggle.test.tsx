import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'

beforeEach(() => {
  document.documentElement.className = 'theme-mixed'
  localStorage.clear()
})

describe('ThemeToggle', () => {
  it('shows current theme label', () => {
    render(<ThemeToggle />)
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('cycles Mixed → Dark → Light → Mixed on click', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(screen.getByText('Dark')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    expect(screen.getByText('Light')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-mixed')).toBe(true)
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('persists theme to localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('dat-theme')).toBe('dark')
  })
})
