import { NavLink } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import styles from './Nav.module.css'

export function Nav() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.logo}>
        <span className={styles.logoIcon}><Cpu size={15} style={{ opacity: 0.7 }} /></span>
        Design AI Toolkit
      </NavLink>
      <div className={styles.links}>
        <NavLink
          to="/"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
          end
        >
          Assistants
        </NavLink>
        <NavLink
          to="/roadmap"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Roadmap
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Resources
        </NavLink>
        <ThemeToggle />
      </div>
    </nav>
  )
}
