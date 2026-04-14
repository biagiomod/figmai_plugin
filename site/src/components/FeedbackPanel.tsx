import { Bug, GitPullRequest } from 'lucide-react'
import styles from './FeedbackPanel.module.css'

type Props = { bugHref: string; changeHref: string }

export function FeedbackPanel({ bugHref, changeHref }: Props) {
  return (
    <div className={styles.wrap}>
      <a href={bugHref} target="_blank" rel="noopener noreferrer" className={styles.panel}>
        <div className={styles.iconWrap} style={{ background: '#d50c7d' }}>
          <Bug size={18} style={{ opacity: 0.7, color: '#fff' }} />
        </div>
        <div>
          <div className={styles.title}>Report a Bug</div>
          <div className={styles.desc}>Found something broken? Open a Jira ticket and we'll triage it.</div>
        </div>
        <span className={styles.cta}>Open Jira →</span>
      </a>
      <a href={changeHref} target="_blank" rel="noopener noreferrer" className={styles.panel}>
        <div className={styles.iconWrap} style={{ background: '#005fcc' }}>
          <GitPullRequest size={18} style={{ opacity: 0.7, color: '#fff' }} />
        </div>
        <div>
          <div className={styles.title}>Request a Change</div>
          <div className={styles.desc}>Want new functionality or a behavior update? Submit a change request.</div>
        </div>
        <span className={styles.cta}>Open Jira →</span>
      </a>
    </div>
  )
}
