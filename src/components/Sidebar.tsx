import ThemeToggle from './ThemeToggle'
import Icon, { type IconName } from './Icon'
import type { User } from '../api'

export interface NavItem {
  id: string
  label: string
  icon: IconName
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

interface Props {
  groups: NavGroup[]
  current: string
  onNavigate: (id: string) => void
  open: boolean
  user?: User | null
  onLogout?: () => void
}

const ROLE_LABEL: Record<string, string> = {
  director: 'Руководитель',
  manager: 'Менеджер обучения',
  trainee: 'Стажёр',
}

export default function Sidebar({ groups, current, onNavigate, open, user, onLogout }: Props) {
  return (
    <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Icon name="graduation" size={22} />
        </div>
        <div>
          <div className="sidebar__title">Свод обучения</div>
          <div className="sidebar__subtitle">Платформа наставника поддержки</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && <div className="nav__group-label">{group.label}</div>}
            {group.items.map((item) => (
              <button
                key={item.id}
                className={'nav__item' + (current === item.id ? ' nav__item--active' : '')}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav__icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        {user && (
          <div className="sidebar__user">
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user.name}</div>
              <div className="sidebar__user-role">{ROLE_LABEL[user.role] || user.role}</div>
            </div>
            <button className="icon-btn icon-btn--sm" title="Выйти" onClick={onLogout}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  )
}
