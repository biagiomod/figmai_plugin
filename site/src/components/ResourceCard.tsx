import { ArrowRight } from 'lucide-react'
import type { ResourceItem } from '../data/resources'
import styles from './ResourceCard.module.css'

type Props = { item: ResourceItem }

export function ResourceCard({ item }: Props) {
  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <div className={styles.top}>
        <span className={styles.tag} style={{ color: item.tagColor, background: `${item.tagColor}18` }}>
          {item.tag}
        </span>
      </div>
      <div className={styles.title}>{item.title}</div>
      <div className={styles.desc}>{item.description}</div>
      <div className={styles.footer}>
        <span className={styles.source}>{item.source}</span>
        <ArrowRight size={11} className={styles.arrow} />
      </div>
    </a>
  )
}
