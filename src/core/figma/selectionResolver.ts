export type SelectionIncludeReason =
  | 'direct'
  | 'expanded-from-section'
  | 'expanded-from-group'
  | 'expanded-from-wrapper'
  | 'leaf-passthrough'

export type SelectionExcludeReason =
  | 'page-or-document'
  | 'node-not-found'
  | 'hidden'

export interface SelectionDiagnostics {
  included: Array<{
    nodeId: string
    nodeName: string
    nodeType: string
    reason: SelectionIncludeReason
  }>
  excluded: Array<{
    nodeId: string
    nodeName: string
    nodeType: string
    reason: SelectionExcludeReason
  }>
  hints: string[]
  duplicateIds: string[]
}

export interface ResolvedSelection {
  scanRoots: SceneNode[]
  diagnostics: SelectionDiagnostics
}

export interface ResolverOptions {
  containerStrategy?: 'expand' | 'direct'
  skipHidden?: boolean
  maxDepth?: number
}

const SCANNABLE_TYPES = new Set<SceneNode['type']>([
  'FRAME',
  'COMPONENT',
  'INSTANCE',
  'COMPONENT_SET'
])

const EXPANDABLE_TYPES = new Set<SceneNode['type']>([
  'SECTION',
  'GROUP',
  'COMPONENT',
  'INSTANCE',
  'COMPONENT_SET'
])

function hasChildren(node: SceneNode): node is SceneNode & ChildrenMixin {
  return 'children' in node
}

function isPageOrDocument(node: BaseNode): boolean {
  return node.type === 'PAGE' || node.type === 'DOCUMENT'
}

function isHiddenNode(node: SceneNode): boolean {
  return node.visible === false
}

function addHint(hints: string[], text: string) {
  if (!hints.includes(text)) hints.push(text)
}

function includeNode(
  node: SceneNode,
  reason: SelectionIncludeReason,
  included: SelectionDiagnostics['included'],
  scanRoots: SceneNode[],
  seen: Set<string>,
  duplicateIds: Set<string>
) {
  if (seen.has(node.id)) {
    duplicateIds.add(node.id)
    return
  }
  seen.add(node.id)
  scanRoots.push(node)
  included.push({
    nodeId: node.id,
    nodeName: node.name || '',
    nodeType: node.type,
    reason
  })
}

function collectDescendantContainers(
  node: SceneNode,
  options: { skipHidden: boolean; maxDepth: number },
  depth = 0,
  out: SceneNode[] = []
): SceneNode[] {
  if (depth >= options.maxDepth) return out
  if (!hasChildren(node)) return out

  for (const child of node.children) {
    const sceneChild = child as SceneNode
    if (options.skipHidden && isHiddenNode(sceneChild)) continue
    if (isPageOrDocument(sceneChild)) continue

    if (SCANNABLE_TYPES.has(sceneChild.type)) {
      out.push(sceneChild)
      continue
    }
    if (hasChildren(sceneChild)) {
      collectDescendantContainers(sceneChild, options, depth + 1, out)
    }
  }
  return out
}

export async function resolveSelection(
  selectedNodeIds: string[],
  options: ResolverOptions = {}
): Promise<ResolvedSelection> {
  const containerStrategy = options.containerStrategy || 'expand'
  const skipHidden = options.skipHidden !== false
  const maxDepth = typeof options.maxDepth === 'number' && options.maxDepth > 0 ? options.maxDepth : 12

  const scanRoots: SceneNode[] = []
  const included: SelectionDiagnostics['included'] = []
  const excluded: SelectionDiagnostics['excluded'] = []
  const hints: string[] = []
  const duplicateIds = new Set<string>()
  const seen = new Set<string>()

  if (selectedNodeIds.length === 0) {
    addHint(hints, 'No selection found. Select one or more frames, sections, or components.')
    return {
      scanRoots,
      diagnostics: { included, excluded, hints, duplicateIds: [] }
    }
  }

  for (const nodeId of selectedNodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId)
    if (!node) {
      excluded.push({
        nodeId,
        nodeName: '',
        nodeType: 'UNKNOWN',
        reason: 'node-not-found'
      })
      continue
    }
    if (isPageOrDocument(node)) {
      excluded.push({
        nodeId: node.id,
        nodeName: (node as BaseNode & { name?: string }).name || '',
        nodeType: node.type,
        reason: 'page-or-document'
      })
      continue
    }
    const sceneNode = node as SceneNode
    if (skipHidden && isHiddenNode(sceneNode)) {
      excluded.push({
        nodeId: sceneNode.id,
        nodeName: sceneNode.name || '',
        nodeType: sceneNode.type,
        reason: 'hidden'
      })
      continue
    }

    if (containerStrategy === 'direct') {
      includeNode(sceneNode, 'direct', included, scanRoots, seen, duplicateIds)
      continue
    }

    if (sceneNode.type === 'FRAME') {
      includeNode(sceneNode, 'direct', included, scanRoots, seen, duplicateIds)
      continue
    }

    if (EXPANDABLE_TYPES.has(sceneNode.type)) {
      const descendants = collectDescendantContainers(sceneNode, { skipHidden, maxDepth })
      if (descendants.length > 0) {
        const reason: SelectionIncludeReason =
          sceneNode.type === 'SECTION'
            ? 'expanded-from-section'
            : sceneNode.type === 'GROUP'
              ? 'expanded-from-group'
              : 'expanded-from-wrapper'
        for (const d of descendants) {
          includeNode(d, reason, included, scanRoots, seen, duplicateIds)
        }
      } else {
        includeNode(sceneNode, 'direct', included, scanRoots, seen, duplicateIds)
        if (sceneNode.type === 'SECTION') {
          addHint(hints, 'Selected section has no descendant frames/containers; scanning section directly.')
        } else if (sceneNode.type === 'GROUP') {
          addHint(hints, 'Selected group has no descendant frames/containers; scanning group directly.')
        }
      }
      continue
    }

    includeNode(sceneNode, 'leaf-passthrough', included, scanRoots, seen, duplicateIds)
    addHint(hints, 'You selected individual layers. For full scans, select a frame, section, or component.')
  }

  if (scanRoots.length === 0) {
    addHint(hints, 'No scannable containers found. Select a Frame, Section, or Component to continue.')
  }

  return {
    scanRoots,
    diagnostics: {
      included,
      excluded,
      hints,
      duplicateIds: Array.from(duplicateIds)
    }
  }
}
