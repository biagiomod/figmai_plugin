import { describe, it, expect } from 'vitest'
import { buildTimeline } from '../compositions/how-to/buildTimeline'
import type { HowToScript } from '../compositions/how-to/types'

const MOCK_SCRIPT: HowToScript = {
  title: 'Test',
  accentColor: '#ff0000',
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter One',
      durationSeconds: 10,
      scenes: [
        { type: 'bullets', heading: 'H1', points: ['p1'] },
        { type: 'bullets', heading: 'H2', points: ['p2'] },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter Two',
      durationSeconds: 6,
      scenes: [{ type: 'terminal', commands: [{ cmd: 'ls' }] }],
    },
  ],
}

describe('buildTimeline', () => {
  it('allocates 60 title frames per chapter', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    const titles = tl.filter(t => t.isTitle)
    expect(titles).toHaveLength(2)
    titles.forEach(t => expect(t.endFrame - t.startFrame).toBe(60))
  })

  it('starts at frame 0', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[0].startFrame).toBe(0)
  })

  it('total duration equals sum of chapter durationSeconds × 30', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[tl.length - 1].endFrame).toBe((10 + 6) * 30)
  })

  it('returns correct entry count per chapter (title + scenes)', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl.filter(t => t.chapterIdx === 0)).toHaveLength(3) // title + 2 scenes
    expect(tl.filter(t => t.chapterIdx === 1)).toHaveLength(2) // title + 1 scene
  })

  it('scene entries use sceneIdx -1 for titles, 0-based index for scenes', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[0].sceneIdx).toBe(-1)
    expect(tl[1].sceneIdx).toBe(0)
    expect(tl[2].sceneIdx).toBe(1)
  })

  it('entries are contiguous (no frame gaps)', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].startFrame).toBe(tl[i - 1].endFrame)
    }
  })
})
