import { describe, it, expect } from 'vitest'
import { ROADMAP_ENTRIES } from '../roadmap'

describe('roadmap data', () => {
  it('has 5 live entries', () => {
    expect(ROADMAP_ENTRIES.filter(e => e.status === 'live')).toHaveLength(5)
  })

  it('has at least 6 backlog entries', () => {
    expect(ROADMAP_ENTRIES.filter(e => e.status === 'backlog').length).toBeGreaterThanOrEqual(6)
  })

  it('each entry has id, name, tagline, accent, and status', () => {
    for (const e of ROADMAP_ENTRIES) {
      expect(e.id).toBeTruthy()
      expect(e.name).toBeTruthy()
      expect(e.tagline).toBeTruthy()
      expect(e.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['live', 'backlog', 'planned']).toContain(e.status)
    }
  })
})
