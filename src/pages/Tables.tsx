import { TABLES } from '../data/tables'
import Icon from '../components/Icon'

export default function Tables() {
  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Инструменты</span>
        <h1>Таблицы и инструменты</h1>
        <p>Каталог рабочих таблиц «Обучение» и их назначение. Ссылки ведут в Google Sheets (демо-заглушки, доступ для менеджмента).</p>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: '34%' }}>Таблица</th>
            <th>Для чего нужно</th>
          </tr>
        </thead>
        <tbody>
          {TABLES.map((t) => (
            <tr key={t.name}>
              <td style={{ fontWeight: 600 }}>
                {t.href ? (
                  <a href={t.href} target="_blank" rel="noreferrer">
                    {t.name} <Icon name="external" size={13} style={{ verticalAlign: '-0.1em' }} />
                  </a>
                ) : (
                  t.name
                )}
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>{t.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
