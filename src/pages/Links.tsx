import { LINK_GROUPS } from '../data/links'
import Icon from '../components/Icon'

export default function Links() {
  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Ресурсы</span>
        <h1>Полезные ссылки</h1>
        <p>Сервисы, таблицы, чаты и материалы, которые нужны наставнику в работе со стажёром.</p>
      </div>

      {LINK_GROUPS.map((group) => (
        <section key={group.title} style={{ marginBottom: 28 }}>
          <h2 className="section" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={group.icon} size={18} /> {group.title}
          </h2>
          <div className="grid grid-2">
            {group.items.map((item) => (
              <a className="tile" key={item.key} href={item.href} target="_blank" rel="noreferrer">
                <div className="tile__title">
                  {item.title} <Icon name="external" size={14} style={{ verticalAlign: '-0.1em' }} />
                </div>
                {item.note && <div className="tile__desc">{item.note}</div>}
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
