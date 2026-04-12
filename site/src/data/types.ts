import type { LucideIcon } from 'lucide-react'

export type Step = { number: number; title: string; description: string }
export type Resource = { title: string; description: string; tag: string; href: string }
export type BestPractice = { title: string; description: string }
export type TeamMember = { name: string; role: string; isLead: boolean; avatarInitials: string }
export type OpenSlot = { role: string; description: string; applyHref: string }
export type StrikeTeam = { members: TeamMember[]; openSlots: OpenSlot[] }
export type AssistantStatus = 'live' | 'backlog' | 'planned'
export type Theme = 'mixed' | 'dark' | 'light'

export type Assistant = {
  id: string
  name: string
  tagline: string
  accent: string
  icon: LucideIcon
  status: AssistantStatus
  video: string
  howToUse: Step[]
  quickActions: string[]
  resources: Resource[]
  bestPractices?: BestPractice[]
  strikeTeam: StrikeTeam
}

export type RoadmapEntry = {
  id: string
  name: string
  tagline: string
  accent: string
  icon: LucideIcon
  status: AssistantStatus
}
