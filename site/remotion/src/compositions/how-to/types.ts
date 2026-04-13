export type BulletsScene = {
  type: 'bullets'
  heading: string
  points: string[]
}

export type TerminalCommand = {
  cmd: string
  output?: string[]
}

export type TerminalScene = {
  type: 'terminal'
  commands: TerminalCommand[]
}

export type TreeLine = {
  text: string
  highlight?: boolean
  dim?: boolean
}

export type FileTreeScene = {
  type: 'filetree'
  lines: TreeLine[]
}

export type FlowNode = { id: string; label: string }
export type FlowArrow = { from: string; to: string }

export type FlowScene = {
  type: 'flow'
  nodes: FlowNode[]
  arrows: FlowArrow[]
}

export type ArchBox = {
  id: string
  label: string
  sublabel?: string
  color: string
}

export type ArchConnection = {
  from: string
  to: string
  label?: string
}

export type ArchScene = {
  type: 'arch'
  boxes: ArchBox[]
  connections: ArchConnection[]
}

export type Scene = BulletsScene | TerminalScene | FileTreeScene | FlowScene | ArchScene

export type Chapter = {
  id: string
  title: string
  durationSeconds: number
  scenes: Scene[]
}

export type HowToScript = {
  title: string
  accentColor: string
  chapters: Chapter[]
}

export type TimelineEntry = {
  startFrame: number
  endFrame: number
  chapterIdx: number
  sceneIdx: number   // -1 for chapter title
  isTitle: boolean
}
