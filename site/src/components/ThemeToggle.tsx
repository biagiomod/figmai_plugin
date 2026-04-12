import { useState, useEffect } from 'react'
import { Sun, Moon, Blend } from 'lucide-react'
import type { Theme } from '../data/types'
import styles from './ThemeToggle.module.css'

const THEMES: Theme[] = ['mixed', 'dark', 'light']
const LABELS: Record<Theme, string> = { mixed: 'Mixed', dark: 'Dark', light: 'Light' }
const ICONS: Record<Theme, React.ReactNode> = {
  mixed: <Blend size={13} style={{ opacity: 0.7 }} />,
  dark:  <Moon  size={13} style={{ opacity: 0.7 }} />,
  light: <Sun   size={13} style={{ opacity: 0.7 }} />,
}
const LS_KEY = 'dat-theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(LS_KEY) as Theme | null
  return stored && THEMES.includes(stored) ? stored : 'mixed'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.remove('theme-mixed', 'theme-dark', 'theme-light')
    document.documentElement.classList.add(`theme-${theme}`)
    localStorage.setItem(LS_KEY, theme)
  }, [theme])

  function cycle() {
    setTheme(t => {
      const idx = THEMES.indexOf(t)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }

  return (
    <button className={styles.toggle} onClick={cycle} aria-label={`Theme: ${LABELS[theme]}`}>
      {ICONS[theme]}
      <span>{LABELS[theme]}</span>
    </button>
  )
}
