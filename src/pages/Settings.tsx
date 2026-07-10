import { useEffect, useState } from 'react'
import { api, type Settings as S, type CronJob } from '../api'
import Icon from '../components/Icon'

const DOW = [
  { v: 1, label: 'Понедельник' },
  { v: 2, label: 'Вторник' },
  { v: 3, label: 'Среда' },
  { v: 4, label: 'Четверг' },
  { v: 5, label: 'Пятница' },
  { v: 6, label: 'Суббота' },
  { v: 0, label: 'Воскресенье' },
]
const hhmm = (j: CronJob) => `${String(j.hour).padStart(2, '0')}:${String(j.min).padStart(2, '0')}`
const dowLabel = (v: number) => DOW.find((d) => d.v === v)?.label || '—'

export default function Settings() {
  const [s, setS] = useState<S | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.getSettings().then(setS).catch(() => {})
  }, [])

  if (!s) return <div className="muted">Загрузка настроек…</div>

  const job = (key: 'prelim' | 'final', patch: Partial<CronJob>) => setS({ ...s, [key]: { ...s[key], ...patch } })
  const setTime = (key: 'prelim' | 'final', v: string) => {
    const [h, m] = v.split(':').map(Number)
    job(key, { hour: h || 0, min: m || 0 })
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const saved = await api.setSettings(s!)
      setS(saved)
      setMsg({ ok: true, text: 'Настройки сохранены, расписание авто-сбора обновлено.' })
    } catch (e: any) {
      setMsg({ ok: false, text: `Не сохранилось: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Система</span>
        <h1>Настройки</h1>
        <p>Расписание автоматического сбора статистики стажёров из Grafana. Время — по часовому поясу сервера (Москва).</p>
      </div>

      {msg && (
        <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
        </div>
      )}

      <div className="form-card">
        <label className="switch">
          <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
          <span>Автоматический сбор включён</span>
        </label>

        <div className="form-grid" style={{ marginTop: 18 }}>
          <div className="field">
            <label>Начало рабочей недели (понедельник), час</label>
            <input
              type="number"
              min={0}
              max={23}
              value={s.startHour}
              onChange={(e) => setS({ ...s, startHour: Number(e.target.value) })}
            />
          </div>
        </div>

        <CronCard
          title="Предварительный сбор"
          hint="Промежуточный срез текущей недели."
          job={s.prelim}
          startHour={s.startHour}
          onDow={(dow) => job('prelim', { dow })}
          onTime={(v) => setTime('prelim', v)}
          onEnd={(endHour) => job('prelim', { endHour })}
        />
        <CronCard
          title="Финальный сбор"
          hint="Итог недели — перезаписывает предварительный, ручные правки сохраняются."
          job={s.final}
          startHour={s.startHour}
          onDow={(dow) => job('final', { dow })}
          onTime={(v) => setTime('final', v)}
          onEnd={(endHour) => job('final', { endHour })}
        />

        <div className="form-card__foot">
          <span className="muted">
            Сейчас: предварительный — {dowLabel(s.prelim.dow)} {hhmm(s.prelim)} (период Пн {s.startHour}:00 → Пт {s.prelim.endHour}:00);
            финальный — {dowLabel(s.final.dow)} {hhmm(s.final)} (период Пн {s.startHour}:00 → Пт {s.final.endHour}:00).
          </span>
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CronCard({
  title,
  hint,
  job,
  startHour,
  onDow,
  onTime,
  onEnd,
}: {
  title: string
  hint: string
  job: CronJob
  startHour: number
  onDow: (v: number) => void
  onTime: (v: string) => void
  onEnd: (v: number) => void
}) {
  return (
    <div className="cron-card">
      <div className="cron-card__title">{title}</div>
      <div className="muted" style={{ marginBottom: 12 }}>{hint}</div>
      <div className="form-grid">
        <div className="field">
          <label>День запуска</label>
          <select value={job.dow} onChange={(e) => onDow(Number(e.target.value))}>
            {DOW.map((d) => (
              <option key={d.v} value={d.v}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Время запуска</label>
          <input type="time" value={hhmm(job)} onChange={(e) => onTime(e.target.value)} />
        </div>
        <div className="field">
          <label>Конец периода: пятница, час</label>
          <input type="number" min={0} max={23} value={job.endHour} onChange={(e) => onEnd(Number(e.target.value))} />
        </div>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        Собирает период: понедельник {startHour}:00 → пятница {job.endHour}:00.
      </div>
    </div>
  )
}
