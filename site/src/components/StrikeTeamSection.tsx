import { ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAssistantsWithOpenSlots } from '../data/strikeTeams'
import styles from './StrikeTeamSection.module.css'

export function StrikeTeamSection() {
  const teams = getAssistantsWithOpenSlots().slice(0, 3)

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Strike Teams</div>
          <h2 className={styles.headline}>Build the tools.<br /><span className={styles.accent}>Join the team.</span></h2>
          <p className={styles.body}>Each assistant is maintained by a small cross-functional Strike Team. Join an existing team, fill an open slot, or submit a proposal to start a new one.</p>
        </div>
        <div className={styles.actions}>
          <a href="#" className={styles.btnPrimary}><Plus size={13} /> Propose a New Assistant</a>
          <button className={styles.btnGhost}>Browse All Teams</button>
        </div>
      </div>
      <div className={styles.grid}>
        {teams.map(a => (
          <div key={a.id} className={styles.card} style={{ '--ac-color': a.accent } as React.CSSProperties}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><a.icon size={14} style={{ opacity: 0.7 }} /></span>
              <span className={styles.cardName}>{a.name}</span>
            </div>
            <div className={styles.avatars}>
              {a.strikeTeam.members.slice(0, 3).map(m => (
                <span key={m.avatarInitials} className={styles.avatar}>{m.avatarInitials}</span>
              ))}
              {a.strikeTeam.openSlots.map((_, i) => (
                <span key={`slot-${i}`} className={styles.avatarEmpty} />
              ))}
            </div>
            <div className={styles.chips}>
              {a.strikeTeam.openSlots.map(s => (
                <span key={s.role} className={styles.chip}>{s.role} open</span>
              ))}
            </div>
            <Link to={`/assistants/${a.id}`} className={styles.viewLink}>
              View team and apply <ArrowRight size={11} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
