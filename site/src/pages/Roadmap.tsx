import { useState } from 'react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { RoadmapCard } from '../components/RoadmapCard'
import { ROADMAP_ENTRIES } from '../data/roadmap'
import type { AssistantStatus } from '../data/types'
import styles from './Roadmap.module.css'

const ALL_STATUSES: AssistantStatus[] = ['live', 'backlog', 'planned']
const STATUS_LABELS: Record<AssistantStatus, string> = { live: 'Live', backlog: 'Backlog', planned: 'Planned' }

export function Roadmap() {
  const [visible, setVisible] = useState<Set<AssistantStatus>>(new Set(ALL_STATUSES))

  function toggle(status: AssistantStatus) {
    setVisible(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <Nav />
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Roadmap</div>
        <h1 className={styles.headline}>What we're building.</h1>
        <p className={styles.sub}>Five assistants are live today. See what's coming next and what's in the backlog.</p>
      </section>

      <div className={styles.body}>
        <div className={styles.filters}>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              className={[styles.pill, visible.has(s) ? styles.pillActive : ''].join(' ')}
              onClick={() => toggle(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className={styles.columns}>
          {ALL_STATUSES.map(status => (
            visible.has(status) && (
              <div key={status} className={styles.column}>
                <div className={styles.colHeader}>
                  <span className={styles.colCount}>
                    {ROADMAP_ENTRIES.filter(e => e.status === status).length}
                  </span>
                </div>
                <div className={styles.cards}>
                  {ROADMAP_ENTRIES.filter(e => e.status === status).map(e => (
                    <RoadmapCard key={e.id} entry={e} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
