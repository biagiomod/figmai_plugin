import { Link } from 'react-router-dom'
import type { RoadmapEntry } from '../data/types'
import styles from './RoadmapCard.module.css'

type Props = { entry: RoadmapEntry }

export function RoadmapCard({ entry }: Props) {
  const { id, name, tagline, accent, icon: Icon, status } = entry
  const isLive = status === 'live'
  const inner = (
    <>
      <div className={styles.iconWrap}><Icon size={15} style={{ opacity: 0.7 }} /></div>
      <div className={styles.body}>
        <div className={styles.name}>{name}</div>
        <div className={styles.tagline}>{tagline}</div>
      </div>
      {isLive && <span className={styles.link}>Open →</span>}
    </>
  )
  if (isLive) {
    return (
      <Link to={`/assistants/${id}`} className={styles.card} style={{ '--ac-color': accent } as React.CSSProperties}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={styles.card} style={{ '--ac-color': accent } as React.CSSProperties}>
      {inner}
    </div>
  )
}
