import { NavLink } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.logo}>
          <span className={styles.logoIcon}><Cpu size={13} style={{ opacity: 0.7 }} /></span>
          Design AI Toolkit
        </span>
        <span className={styles.copy}>© {new Date().getFullYear()} — All rights reserved</span>
      </div>
      <nav className={styles.links}>
        <NavLink to="/" className={styles.link}>Assistants</NavLink>
        <NavLink to="/roadmap" className={styles.link}>Roadmap</NavLink>
        <NavLink to="/resources" className={styles.link}>Resources</NavLink>
      </nav>
    </footer>
  )
}
