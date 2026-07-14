import { useEffect, useState } from 'react'
import { api, type Settings as S, type CronJob, type GrafanaConfig } from '../api'
import type { GrafanaBoard } from '../data/stats'
import Icon from '../components/Icon'

const uid = () => Math.random().toString(36).slice(2, 9)

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

      <GrafanaConnectionCard />
      <BoardsCard />
    </div>
  )
}

function GrafanaConnectionCard() {
  const [cfg, setCfg] = useState<GrafanaConfig | null>(null)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.getGrafanaConfig().then((c) => {
      setCfg(c)
      setUrl(c.url)
    }).catch(() => {})
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const saved = await api.setGrafanaConfig(url.trim(), token.trim() || undefined)
      setCfg(saved)
      setToken('')
      flash(true, 'Подключение к Grafana сохранено.')
    } catch (e: any) {
      flash(false, `Не сохранилось: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!cfg) return null

  return (
    <div className="form-card" style={{ marginTop: 24 }}>
      <div className="form-card__title">Подключение к Grafana</div>
      <p className="muted" style={{ marginTop: -4 }}>
        URL и API-токен используются бэкендом для сбора статистики и дашбордов. Токен хранится только
        на сервере и никогда не отдаётся в браузер — сюда он подставляется как ••••••.
      </p>

      {msg && (
        <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label>URL Grafana</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://grafana.example.com" />
        </div>
        <div className="field">
          <label>API-токен (service account)</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={cfg.hasToken ? '•••••••• (уже задан, оставь пустым, чтобы не менять)' : 'glsa_…'}
          />
        </div>
      </div>
      <div className="form-card__foot">
        <span className="muted">{cfg.hasToken ? 'Токен задан.' : 'Токен ещё не задан — сбор из Grafana работать не будет.'}</span>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function BoardsCard() {
  const [boards, setBoardsState] = useState<GrafanaBoard[]>([])
  const [draft, setDraft] = useState({ name: '', uid: '', queueVar: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.getBoards().then(setBoardsState).catch(() => {})
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function persist(next: GrafanaBoard[]) {
    setBusy(true)
    setBoardsState(next)
    try {
      await api.setBoards(next)
      flash(true, 'Список дашбордов сохранён.')
    } catch (e: any) {
      flash(false, `Не сохранилось: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    if (!draft.name.trim() || !draft.uid.trim()) return flash(false, 'Укажи название и UID дашборда')
    const board: GrafanaBoard = { id: uid(), name: draft.name.trim(), uid: draft.uid.trim() }
    if (draft.queueVar.trim()) board.queueVar = draft.queueVar.trim()
    persist([...boards, board])
    setDraft({ name: '', uid: '', queueVar: '' })
  }
  const remove = (id: string) => persist(boards.filter((b) => b.id !== id))

  return (
    <div className="form-card" style={{ marginTop: 24 }}>
      <div className="form-card__title">Дашборды Grafana</div>
      <p className="muted" style={{ marginTop: -4 }}>
        Добавь любой дашборд Grafana по его UID — он появится доп. виджетом на вкладке «Дашборды» в
        Статистике, отдельно от основного еженедельного сбора тикетов/скорости/качества.
      </p>

      {msg && (
        <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label>Название</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Выгрузка тикетов" />
        </div>
        <div className="field">
          <label>UID дашборда</label>
          <input value={draft.uid} onChange={(e) => setDraft({ ...draft, uid: e.target.value })} placeholder="my-dashboard-uid" />
        </div>
        <div className="field">
          <label>Переменная-фильтр (необязательно)</label>
          <input value={draft.queueVar} onChange={(e) => setDraft({ ...draft, queueVar: e.target.value })} placeholder="queue" />
        </div>
      </div>
      <div className="form-card__foot">
        <span className="muted">По умолчанию используется переменная queue из общих настроек Grafana.</span>
        <button className="btn" onClick={add} disabled={busy}>
          <Icon name="plus" size={16} /> Добавить
        </button>
      </div>

      {boards.length > 0 && (
        <table className="data" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Название</th>
              <th>UID</th>
              <th>Фильтр</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => (
              <tr key={b.id}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td className="muted" style={{ fontFamily: 'monospace' }}>{b.uid}</td>
                <td className="muted">{b.queueVar || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="tag-remove" title="Удалить" onClick={() => remove(b.id)}>
                    <Icon name="close" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
