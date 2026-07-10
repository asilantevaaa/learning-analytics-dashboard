import { useEffect, useState } from 'react'
import Icon from './Icon'

type Theme = 'light' | 'dark'

function getInitial(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <button className="theme-toggle" onClick={toggle} title="Переключить тему">
      <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
      <span>{theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
    </button>
  )
}
