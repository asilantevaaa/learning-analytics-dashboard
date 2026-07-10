import { CRITERIA, CRITERIA_NOTE } from '../data/criteria'
import Icon from '../components/Icon'

export default function Criteria() {
  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Испытательный срок</span>
        <h1>Критерии выхода с ИС</h1>
        <p>Показатели скорости и качества, необходимые для прохождения испытательного срока.</p>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>Показатель</th>
            <th>Чаты</th>
            <th>Тикеты</th>
            <th>Качество</th>
          </tr>
        </thead>
        <tbody>
          {CRITERIA.map((r) => (
            <tr key={r.track}>
              <td style={{ fontWeight: 600 }}>{r.track}</td>
              <td>{r.chats}</td>
              <td>{r.tickets}</td>
              <td>{r.quality}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="callout callout--warn"><Icon name="warn" size={16} /> {CRITERIA_NOTE}</div>
    </div>
  )
}
