// Strike team data is embedded directly in each Assistant entry in assistants.ts.
// This file re-exports helpers used by StrikeTeamSection on the homepage.
import { LIVE_ASSISTANTS } from './assistants'
export type { StrikeTeam, TeamMember, OpenSlot } from './types'

export function getAssistantsWithOpenSlots() {
  return LIVE_ASSISTANTS.filter(a => a.strikeTeam.openSlots.length > 0)
}
