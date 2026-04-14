import type { HowToScript, TimelineEntry } from './types'

const TITLE_FRAMES = 60

export function buildTimeline(script: HowToScript): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  let frame = 0

  for (let ci = 0; ci < script.chapters.length; ci++) {
    const chapter = script.chapters[ci]
    const totalFrames = chapter.durationSeconds * 30
    const contentFrames = totalFrames - TITLE_FRAMES
    const sceneCount = chapter.scenes.length
    const framesPerScene = Math.floor(contentFrames / sceneCount)

    entries.push({
      startFrame: frame,
      endFrame: frame + TITLE_FRAMES,
      chapterIdx: ci,
      sceneIdx: -1,
      isTitle: true,
    })
    frame += TITLE_FRAMES

    for (let si = 0; si < sceneCount; si++) {
      const isLast = si === sceneCount - 1
      const sceneFrames = isLast
        ? contentFrames - framesPerScene * (sceneCount - 1)
        : framesPerScene
      entries.push({
        startFrame: frame,
        endFrame: frame + sceneFrames,
        chapterIdx: ci,
        sceneIdx: si,
        isTitle: false,
      })
      frame += sceneFrames
    }
  }

  return entries
}
