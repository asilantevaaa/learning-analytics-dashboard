import { PLAN } from '../data/plan'
import Icon from '../components/Icon'

export default function Plan() {
  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Онбординг</span>
        <h1>План работы со стажёром L1</h1>
        <p>Пошаговый план обучения по неделям и дням — от первого дня до выхода с испытательного срока.</p>
      </div>

      {PLAN.map((week) => (
        <section className="week" key={week.id}>
          <div className="week__head">
            <h2>{week.title}</h2>
            {week.subtitle && <p>{week.subtitle}</p>}
          </div>
          <div className="timeline">
            {week.days.map((day) => (
              <div className={'day day--' + day.kind} key={day.id}>
                <div className="day__card">
                  <span className="day__badge">{day.badge}</span>
                  <div className="day__title">
                    {day.kind === 'call' && <Icon name="phone" size={15} style={{ verticalAlign: '-0.15em', marginRight: 6 }} />}
                    {day.kind === 'milestone' && <Icon name="star" size={15} style={{ verticalAlign: '-0.15em', marginRight: 6 }} />}
                    {day.title}
                  </div>
                  <ul className="day__points">
                    {day.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                  {day.links && day.links.length > 0 && (
                    <div className="day__links">
                      {day.links.map((l, i) => (
                        <a className="chip" key={i} href={l.href} target="_blank" rel="noreferrer">
                          <Icon name="link" size={13} /> {l.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
