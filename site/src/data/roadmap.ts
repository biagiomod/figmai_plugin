import {
  MessageSquare, Leaf, Eye, Lightbulb, BarChart2,
  Pencil, Layers, Users, Zap, BookOpen, Globe, Sliders,
} from 'lucide-react'
import type { RoadmapEntry } from './types'

export const ROADMAP_ENTRIES: RoadmapEntry[] = [
  // Live
  { id: 'general',           name: 'General',           tagline: 'Open-ended design Q&A and component briefs.',      accent: '#4a90e2', icon: MessageSquare, status: 'live' },
  { id: 'evergreens',        name: 'Evergreens',        tagline: 'Find, update, and create reusable patterns.',       accent: '#007a39', icon: Leaf,          status: 'live' },
  { id: 'accessibility',     name: 'Accessibility',     tagline: 'WCAG checks, remediation copy, and audit exports.', accent: '#e07b00', icon: Eye,           status: 'live' },
  { id: 'design-workshop',   name: 'Design Workshop',   tagline: 'Structured ideation and artifact export.',          accent: '#7c3aed', icon: Lightbulb,     status: 'live' },
  { id: 'analytics-tagging', name: 'Analytics Tagging', tagline: 'Taxonomy-aligned Jira tags for handoff.',           accent: '#008282', icon: BarChart2,     status: 'live' },
  // Backlog
  { id: 'copywriting',       name: 'Copywriting',       tagline: 'UX copy generation for UI components.',             accent: '#c0006a', icon: Pencil,        status: 'backlog' },
  { id: 'component-spec',    name: 'Component Spec',    tagline: 'Auto-generate component spec documentation.',       accent: '#005fcc', icon: Layers,        status: 'backlog' },
  { id: 'user-research',     name: 'User Research',     tagline: 'Research synthesis and insight summaries.',         accent: '#9a5500', icon: Users,         status: 'backlog' },
  { id: 'design-tokens',     name: 'Design Tokens',     tagline: 'Token generation and style guide authoring.',       accent: '#5600cc', icon: Zap,           status: 'backlog' },
  { id: 'onboarding',        name: 'Onboarding',        tagline: 'New designer onboarding flows and checklists.',     accent: '#008282', icon: BookOpen,      status: 'backlog' },
  { id: 'localization',      name: 'Localization',      tagline: 'Internationalization guidance and copy review.',    accent: '#007a60', icon: Globe,         status: 'backlog' },
  // Planned
  { id: 'design-ops',        name: 'Design Ops',        tagline: 'Process automation for design team operations.',    accent: '#555555', icon: Sliders,       status: 'planned' },
]
