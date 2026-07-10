import { useState } from 'react'
import { FAQ, DAY1_CHECKLIST } from '../data/faq'
import Icon from '../components/Icon'

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const [done, setDone] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('day1-checklist') || '[]'))
    } catch {
      return new Set()
    }
  })

  const toggleDone = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('day1-checklist', JSON.stringify([...next]))
      return next
    })

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Справка</span>
        <h1>FAQ и чек-листы</h1>
        <p>Частые вопросы наставника и чек-лист первого дня стажёра.</p>
      </div>

      <h2 className="section" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="check" size={18} /> Чек-лист первого дня
      </h2>
      <div className="card" style={{ padding: 0 }}>
        {DAY1_CHECKLIST.map((item) => (
          <label className={'checklist-item' + (done.has(item.id) ? ' done' : '')} key={item.id}>
            <input type="checkbox" checked={done.has(item.id)} onChange={() => toggleDone(item.id)} />
            <span>{item.text}</span>
          </label>
        ))}
      </div>

      <h2 className="section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="help" size={18} /> Частые вопросы
      </h2>
      {FAQ.map((item, i) => (
        <div className="faq-item" key={i}>
          <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{item.q}</span>
            <span>{open === i ? '−' : '+'}</span>
          </div>
          {open === i && <div className="faq-a">{item.a}</div>}
        </div>
      ))}
    </div>
  )
}
