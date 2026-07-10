import { PLAN } from '../data/plan'
import { REFERENCE } from '../data/reference'
import Icon, { type IconName } from '../components/Icon'

interface Props {
  onNavigate: (id: string) => void
}

const TILES: { id: string; icon: IconName; title: string; desc: string }[] = [
  { id: 'plan', icon: 'map', title: 'План онбординга', desc: 'Пошаговый план по неделям и дням: от первого дня до выхода с ИС.' },
  { id: 'criteria', icon: 'target', title: 'Критерии выхода с ИС', desc: 'Скорость и качество для прохождения испытательного срока.' },
  { id: 'statistics', icon: 'chart', title: 'Статистика', desc: 'Сбор данных из Grafana, умные ссылки и шкала дисциплины.' },
  { id: 'reference', icon: 'book', title: 'Справочник', desc: 'Каталог статей BookStack: Jivo, Mango, GPT-бот, метрики и др.' },
  { id: 'tables', icon: 'table', title: 'Таблицы и инструменты', desc: 'Каталог рабочих таблиц и их назначение.' },
  { id: 'links', icon: 'link', title: 'Полезные ссылки', desc: 'Сервисы, чаты, доступы, деловая игра и звонки.' },
  { id: 'faq', icon: 'help', title: 'FAQ и чек-листы', desc: 'Частые вопросы и чек-лист первого дня.' },
]

export default function Dashboard({ onNavigate }: Props) {
  const refPages = REFERENCE.reduce((s, c) => s + c.pages.length, 0)
  const days = PLAN.reduce((s, w) => s + w.days.length, 0)

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Главная</span>
        <h1>Свод обучения</h1>
        <p>Единая платформа для наставников: онбординг стажёров L1, критерии, статистика и справочник в одном месте.</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-card__value">9</div>
          <div className="stat-card__label">недель обучения</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{refPages}</div>
          <div className="stat-card__label">статей в справочнике</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{days}</div>
          <div className="stat-card__label">этапов в плане</div>
        </div>
      </div>

      <h2 className="section">Разделы</h2>
      <div className="grid grid-2">
        {TILES.map((t) => (
          <button key={t.id} className="tile" onClick={() => onNavigate(t.id)}>
            <div className="tile__icon"><Icon name={t.icon} size={24} /></div>
            <div className="tile__title">{t.title}</div>
            <div className="tile__desc">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
