import { UserPlus } from 'lucide-react'
import type { StrikeTeam } from '../data/types'
import styles from './StrikeTeamProfile.module.css'

type Props = { teamName: string; strikeTeam: StrikeTeam }

export function StrikeTeamProfile({ teamName, strikeTeam }: Props) {
  const { members, openSlots } = strikeTeam
  return (
    <section className={styles.section}>
      <div className={styles.eyebrow}>Strike Team</div>
      <h2 className={styles.headline}>Meet the {teamName} team</h2>
      <p className={styles.subtext}>A cross-functional group responsible for building, maintaining, and improving this assistant. Open slots are listed below.</p>
      <div className={styles.body}>
        <div className={styles.members}>
          <div className={styles.listLabel}>Current Members</div>
          {members.map(m => (
            <div key={m.name} className={styles.memberRow}>
              <span className={styles.avatar}>{m.avatarInitials}</span>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.name}</span>
                <span className={styles.memberRole}>{m.role}</span>
              </div>
              <span className={styles.badge} data-lead={m.isLead}>{m.isLead ? 'Lead' : 'Member'}</span>
            </div>
          ))}
        </div>
        <div className={styles.slots}>
          <div className={styles.slotsHeader}>
            <UserPlus size={14} />
            <span>Open Slots</span>
            <span className={styles.slotCount}>{openSlots.length} position{openSlots.length !== 1 ? 's' : ''} available</span>
          </div>
          {openSlots.length > 0 ? (
            <>
              {openSlots.map(s => (
                <div key={s.role} className={styles.slotRow}>
                  <div className={styles.slotInfo}>
                    <div className={styles.slotRole}>{s.role}</div>
                    <div className={styles.slotDesc}>{s.description}</div>
                  </div>
                  <a href={s.applyHref} className={styles.applyLink}>+ Apply</a>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.noSlots}>Team is full. Check back for future openings.</p>
          )}
          <a href="#" className={styles.interestBtn}>Express Interest</a>
        </div>
      </div>
    </section>
  )
}
