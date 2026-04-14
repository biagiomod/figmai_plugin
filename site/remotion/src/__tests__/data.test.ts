import { describe, it, expect } from 'vitest'
import { VIDEO_ASSISTANTS } from '../data'

describe('VIDEO_ASSISTANTS', () => {
  it('exports exactly 5 live assistants', () => {
    expect(VIDEO_ASSISTANTS).toHaveLength(5)
  })

  it('contains all expected assistant IDs', () => {
    const ids = VIDEO_ASSISTANTS.map(a => a.id)
    expect(ids).toContain('general')
    expect(ids).toContain('evergreens')
    expect(ids).toContain('accessibility')
    expect(ids).toContain('design-workshop')
    expect(ids).toContain('analytics-tagging')
  })

  it('every assistant has required video fields', () => {
    for (const a of VIDEO_ASSISTANTS) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.tagline).toBeTruthy()
      expect(a.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.icon).toBeTruthy()
      expect(a.howToUse.length).toBeGreaterThanOrEqual(1)
      expect(a.quickActions.length).toBeGreaterThanOrEqual(1)
    }
  })
})
