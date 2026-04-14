import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { AssistantPage } from './pages/AssistantPage'
import { Roadmap } from './pages/Roadmap'
import { Resources } from './pages/Resources'
import type { Theme } from './data/types'

const LS_KEY = 'dat-theme'

function applyStoredTheme() {
  const stored = localStorage.getItem(LS_KEY) as Theme | null
  const theme = stored ?? 'mixed'
  document.documentElement.classList.remove('theme-mixed', 'theme-dark', 'theme-light')
  document.documentElement.classList.add(`theme-${theme}`)
}

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/assistants', element: <Navigate to="/" replace /> },
  { path: '/assistants/:slug', element: <AssistantPage /> },
  { path: '/roadmap', element: <Roadmap /> },
  { path: '/resources', element: <Resources /> },
], { basename: import.meta.env.BASE_URL })

export function App() {
  useEffect(() => { applyStoredTheme() }, [])
  return <RouterProvider router={router} />
}
