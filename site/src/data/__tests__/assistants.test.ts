import { describe, it, expect } from 'vitest'
import { ASSISTANTS, getAssistant, LIVE_ASSISTANTS } from '../assistants'

describe('assistants data', () => {
  it('has exactly 5 live assistants', () => {
    expect(LIVE_ASSISTANTS).toHaveLength(5)
  })

  it('each assistant has required fields', () => {
    for (const a of ASSISTANTS) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.howToUse.length).toBeGreaterThanOrEqual(3)
      expect(a.quickActions.length).toBeGreaterThanOrEqual(2)
      expect(a.resources.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('getAssistant returns correct entry by id', () => {
    const a = getAssistant('evergreens')
    expect(a?.name).toBe('Evergreens')
  })

  it('getAssistant returns undefined for unknown id', () => {
    expect(getAssistant('does-not-exist')).toBeUndefined()
  })

  it('only evergreens has bestPractices', () => {
    const eg = getAssistant('evergreens')
    expect(eg?.bestPractices).toBeDefined()
    const others = ASSISTANTS.filter(a => a.id !== 'evergreens')
    for (const a of others) {
      expect(a.bestPractices).toBeUndefined()
    }
  })

  it('slugs match expected values', () => {
    const ids = ASSISTANTS.map(a => a.id)
    expect(ids).toEqual(['general', 'evergreens', 'accessibility', 'design-workshop', 'analytics-tagging'])
  })
})
