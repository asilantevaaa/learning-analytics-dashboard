import { useEffect, useMemo, useState } from 'react'
import Sidebar, { NavGroup } from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Plan from './pages/Plan'
import Criteria from './pages/Criteria'
import Statistics from './pages/Statistics'
import Scripts from './pages/Scripts'
import Reference from './pages/Reference'
import Tables from './pages/Tables'
import Links from './pages/Links'
import Faq from './pages/Faq'
import Settings from './pages/Settings'
import Users from './pages/Users'
import Login from './pages/Login'
import { api, auth, setUnauthorizedHandler, type User } from './api'
import Icon from './components/Icon'
import { isActive, type Trainee } from './data/norms'

// Базовые разделы знаний — доступны всем ролям.
const KNOWLEDGE: NavGroup = {
  label: 'База знаний',
  items: [
    { id: 'reference', label: 'Справочник', icon: 'book' },
    { id: 'tables', label: 'Таблицы', icon: 'table' },
    { id: 'links', label: 'Полезные ссылки', icon: 'link' },
  ],
}
const LEARNING: NavGroup = {
  label: 'Обучение',
  items: [
    { id: 'plan', label: 'План онбординга', icon: 'map' },
    { id: 'criteria', label: 'Критерии выхода с ИС', icon: 'target' },
    { id: 'faq', label: 'FAQ и чек-листы', icon: 'help' },
  ],
}

function currentRoute(): string {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h.startsWith('trainee:')) return h
  return h || 'home'
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [route, setRoute] = useState<string>(currentRoute)
  const [menuOpen, setMenuOpen] = useState(false)
  const [trainees, setTrainees] = useState<Trainee[]>([])

  // Проверка сессии при загрузке.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    if (auth.get()) {
      api.me().then(setUser).catch(() => setUser(null)).finally(() => setAuthReady(true))
    } else {
      setAuthReady(true)
    }
  }, [])

  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (user) api.getTrainees().then(setTrainees).catch(() => {})
  }, [user])

  const role = user?.role

  // Навигация под роль.
  const groups = useMemo<NavGroup[]>(() => {
    if (!user) return []
    const active = trainees.filter(isActive)
    const traineesGroup: NavGroup | null = active.length
      ? {
          label: role === 'manager' ? 'Мои стажёры' : 'Стажёры на обучении',
          items: active.map((t) => ({ id: 'trainee:' + t.login, label: t.name || t.login, icon: 'user' as const })),
        }
      : null

    if (role === 'trainee') {
      const my = user.login ? [{ id: 'trainee:' + user.login, label: 'Моя статистика', icon: 'chart' as const }] : []
      return [{ items: my }, LEARNING, KNOWLEDGE]
    }
    if (role === 'manager') {
      return [
        { items: [{ id: 'home', label: 'Главная', icon: 'home' }] },
        LEARNING,
        { label: 'Аналитика', items: [{ id: 'statistics', label: 'Статистика', icon: 'chart' }] },
        KNOWLEDGE,
        ...(traineesGroup ? [traineesGroup] : []),
      ]
    }
    // director
    return [
      { items: [{ id: 'home', label: 'Главная', icon: 'home' }] },
      LEARNING,
      {
        label: 'Аналитика',
        items: [
          { id: 'statistics', label: 'Статистика', icon: 'chart' },
          { id: 'users', label: 'Пользователи', icon: 'users' },
        ],
      },
      KNOWLEDGE,
      ...(traineesGroup ? [traineesGroup] : []),
      { items: [{ id: 'settings', label: 'Настройки', icon: 'gear' }] },
    ]
  }, [user, role, trainees])

  const validIds = useMemo(() => new Set(groups.flatMap((g) => g.items.map((i) => i.id))), [groups])
  const focusLogin = route.startsWith('trainee:') ? route.slice('trainee:'.length) : undefined

  const navigate = (id: string) => {
    window.location.hash = '/' + (id === 'home' ? '' : id)
    setRoute(id)
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  async function doLogout() {
    try {
      await api.logout()
    } catch {}
    auth.clear()
    setUser(null)
    setTrainees([])
  }

  if (!authReady) return <div style={{ padding: 40 }} className="muted">Загрузка…</div>
  if (!user) return <Login onLogin={setUser} />

  const render = () => {
    // Стажёр видит только свою статистику и базу знаний.
    if (role === 'trainee') {
      if (focusLogin) return <Statistics focusLogin={focusLogin} role={role} />
      switch (route) {
        case 'plan': return <Plan />
        case 'criteria': return <Criteria />
        case 'faq': return <Faq />
        case 'reference': return <Reference />
        case 'tables': return <Tables />
        case 'links': return <Links />
        default:
          return user.login ? <Statistics focusLogin={user.login} role={role} /> : <div className="muted">Профиль не привязан к стажёру.</div>
      }
    }

    if (focusLogin) return <Statistics focusLogin={focusLogin} role={role} />
    switch (route) {
      case 'plan': return <Plan />
      case 'criteria': return <Criteria />
      case 'statistics': return <Statistics role={role} />
      case 'settings': return role === 'director' ? <Settings /> : <Dashboard onNavigate={navigate} />
      case 'users': return role === 'director' ? <Users /> : <Dashboard onNavigate={navigate} />
      case 'scripts': return <Scripts />
      case 'reference': return <Reference />
      case 'tables': return <Tables />
      case 'links': return <Links />
      default: return <Dashboard onNavigate={navigate} />
    }
  }

  // Если маршрут невалиден для роли — на дефолт.
  if (route !== 'home' && !focusLogin && !validIds.has(route) && !['scripts'].includes(route)) {
    // не редиректим жёстко, render() сам отдаст дефолт
  }

  return (
    <div className="layout">
      <Sidebar groups={groups} current={route} onNavigate={navigate} open={menuOpen} user={user} onLogout={doLogout} />
      <div className={'scrim' + (menuOpen ? ' scrim--show' : '')} onClick={() => setMenuOpen(false)} />
      <div className="main">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <strong>Свод обучения</strong>
          <span style={{ width: 38 }} />
        </div>
        <main className="content">{render()}</main>
      </div>
    </div>
  )
}
