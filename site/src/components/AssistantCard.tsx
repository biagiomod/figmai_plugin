import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Assistant } from '../data/types'
import styles from './AssistantCard.module.css'

type Props = { assistant: Assistant }

export function AssistantCard({ assistant }: Props) {
  const { id, name, tagline, accent, icon: Icon } = assistant
  return (
    <Link
      to={`/assistants/${id}`}
      className={styles.card}
      style={{ '--ac-color': accent } as React.CSSProperties}
    >
      <div className={styles.iconWrap}>
        <Icon size={18} style={{ opacity: 0.7 }} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.tagline}>{tagline}</p>
      </div>
      <div className={styles.cta}>
        Open <ArrowRight size={12} />
      </div>
    </Link>
  )
}
