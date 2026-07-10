import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type Trainee,
  type Group,
  type WeekData,
  type WeekRow,
  type Tone,
  speedNorm,
  qualityNorm,
  speedTone,
  qualityTone,
  pctTone,
  disciplineTone,
  endISDate,
  isActive,
  STAGES,
  currentStage,
  daysWithUs,
} from '../data/norms'
import { api, type Meta } from '../api'
import Icon from '../components/Icon'

const GROUPS: Group[] = ['Л1', 'SSL', 'Домены']

/* ===== даты (локальные, без UTC-сдвига) ===== */
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function mondayOf(iso: string): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return localIso(d)
}
const addDays = (iso: string, n: number) => {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return localIso(d)
}
const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
const uid = () => Math.random().toString(36).slice(2, 9)
const monthName = (mk: string) =>
  parseIso(mk + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

const speedOf = (r: WeekRow) => r.speedOverride ?? r.speed
const qualityOf = (r: WeekRow) => r.quality ?? r.qualityAuto ?? null

type Tab = 'week' | 'months' | 'overview' | 'trainees'

export default function Statistics({ focusLogin, role }: { focusLogin?: string; role?: 'director' | 'manager' | 'trainee' } = {}) {
  const canEdit = role !== 'trainee'
  const canManageTrainees = role === 'director'
  const [tab, setTab] = useState<Tab>('week')
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [meta, setMeta] = useState<Meta>({ mentors: [], leads: [] })
  const [weeks, setWeeks] = useState<Record<string, WeekData>>({})
  const [weekStart, setWeekStart] = useState<string>(() => mondayOf(localIso(new Date())))
  const [busy, setBusy] = useState<string>('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart])

  useEffect(() => {
    api.getTrainees().then(setTrainees).catch(() => {})
    api.getMeta().then(setMeta).catch(() => {})
    api.weeks().then(setWeeks).catch(() => {})
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 5000)
  }

  async function saveTrainees(next: Trainee[]) {
    setTrainees(next)
    try {
      await api.setTrainees(next)
    } catch (e: any) {
      flash(false, `Не сохранилось: ${e.message}`)
    }
  }
  async function saveMeta(next: Meta) {
    setMeta(next)
    try {
      await api.setMeta(next)
    } catch (e: any) {
      flash(false, `Не сохранилось: ${e.message}`)
    }
  }

  async function collect() {
    setBusy('collect')
    try {
      const w = await api.collectWeek(weekStart)
      setWeeks((prev) => ({ ...prev, [weekStart]: w }))
      flash(true, `Неделя ${fmt(weekStart)} собрана: стажёров ${Object.keys(w.rows).length}.`)
    } catch (e: any) {
      flash(false, `Сбор не удался: ${e.message}. Проверь, что бэкенд запущен и VPN включён.`)
    } finally {
      setBusy('')
    }
  }
  async function checkHealth() {
    setBusy('health')
    try {
      const h = await api.health()
      flash(true, `Grafana доступна${h.version ? ` (v${h.version})` : ''}, статус ${h.status}.`)
    } catch (e: any) {
      flash(false, `Прокси/Grafana недоступны: ${e.message}.`)
    } finally {
      setBusy('')
    }
  }

  async function removeWeek(weekKey: string) {
    if (!confirm(`Удалить собранную неделю ${fmt(weekKey)}? Действие необратимо.`)) return
    setWeeks((prev) => {
      const next = { ...prev }
      delete next[weekKey]
      return next
    })
    try {
      await api.deleteWeek(weekKey)
      flash(true, `Неделя ${fmt(weekKey)} удалена.`)
    } catch (e: any) {
      flash(false, `Не удалось удалить: ${e.message}`)
    }
  }

  async function patch(weekKey: string, login: string, field: keyof WeekRow, value: number | string | undefined) {
    setWeeks((prev) => {
      const wk = prev[weekKey]
      if (!wk?.rows[login]) return prev
      return { ...prev, [weekKey]: { ...wk, rows: { ...wk.rows, [login]: { ...wk.rows[login], [field]: value } } } }
    })
    try {
      await api.patchRow(weekKey, login, { [field]: value } as any)
    } catch {}
  }

  const activeTrainees = trainees.filter(isActive)
  const focused = focusLogin ? trainees.find((t) => t.login === focusLogin) : undefined

  function finishFocused() {
    if (!focused) return
    const d = prompt('Дата закрытия ИС (ГГГГ-ММ-ДД):', localIso(new Date()))
    if (!d) return
    const stages = [...new Set([...(focused.stages || []), 'closed'])]
    const comment = `${focused.comment || ''}\n[${fmt(d)}] Завершил обучение`.trim()
    saveTrainees(trainees.map((t) => (t.id === focused.id ? { ...t, closedIS: d, stages, comment } : t)))
    flash(true, `${focused.name}: обучение завершено (${fmt(d)}).`)
  }
  function fireFocused() {
    if (!focused) return
    const d = prompt('Дата увольнения (ГГГГ-ММ-ДД):', localIso(new Date()))
    if (!d) return
    const reason = prompt('Причина увольнения:', '') || ''
    const comment = `${focused.comment || ''}\n[${fmt(d)} Уволен]${reason ? ': ' + reason : ''}`.trim()
    saveTrainees(trainees.map((t) => (t.id === focused.id ? { ...t, fired: d, comment } : t)))
    flash(true, `${focused.name}: уволен (${fmt(d)}).`)
  }
  const focusedInactive = !!(focused && (focused.closedIS || focused.fired))

  useEffect(() => {
    if (focusLogin) setTab('week')
  }, [focusLogin])

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Аналитика</span>
        {focused ? (
          <div className="page-header__row">
            <h1>{focused.name}</h1>
            <div className="page-header__actions">
              {focused.closedIS && <span className="chip">ИС закрыт {fmt(focused.closedIS)}</span>}
              {focused.fired && <span className="chip chip--off">Уволен {fmt(focused.fired)}</span>}
              {canEdit && (
                <>
                  <button className="btn btn--sm" onClick={finishFocused} disabled={focusedInactive}>
                    <Icon name="check" size={15} /> Закончил обучение
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={fireFocused} disabled={focusedInactive}>
                    <Icon name="close" size={15} /> Увольняется
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <h1>Статистика стажёров</h1>
        )}
        <p>
          Понедельный сбор показателей из Grafana по обучающимся стажёрам с раскраской по нормам, ручными полями
          (качество КК, дисциплина) и сводками. В неделю входят только те, кто уже обучался в этот период.
        </p>
      </div>

      {!focusLogin && (
        <div className="tabs">
          <button className={'tab' + (tab === 'week' ? ' tab--on' : '')} onClick={() => setTab('week')}>
            <Icon name="chart" size={16} /> По неделям
          </button>
          <button className={'tab' + (tab === 'months' ? ' tab--on' : '')} onClick={() => setTab('months')}>
            <Icon name="calendar" size={16} /> По месяцам
          </button>
          <button className={'tab' + (tab === 'overview' ? ' tab--on' : '')} onClick={() => setTab('overview')}>
            <Icon name="chart" size={16} /> Общая статистика
          </button>
          {canManageTrainees && (
            <button className={'tab' + (tab === 'trainees' ? ' tab--on' : '')} onClick={() => setTab('trainees')}>
              <Icon name="users" size={16} /> Стажёры ({activeTrainees.length})
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
        </div>
      )}

      {tab === 'trainees' && !focusLogin && (
        <TraineesTab trainees={trainees} meta={meta} onChange={saveTrainees} onMeta={saveMeta} />
      )}

      {focusLogin && focused && (
        <TraineeFocus
          trainee={focused}
          weeks={weeks}
          canEdit={canEdit}
          onToggleStage={(key) => {
            const has = focused.stages?.includes(key)
            const stages = has
              ? (focused.stages || []).filter((s) => s !== key)
              : [...(focused.stages || []), key]
            saveTrainees(trainees.map((t) => (t.id === focused.id ? { ...t, stages } : t)))
          }}
          onSetStageDate={(key, date) => {
            const stageDates = { ...(focused.stageDates || {}) }
            if (date) stageDates[key] = date
            else delete stageDates[key]
            const stages = date
              ? [...new Set([...(focused.stages || []), key])]
              : focused.stages || []
            saveTrainees(trainees.map((t) => (t.id === focused.id ? { ...t, stageDates, stages } : t)))
          }}
        />
      )}

      {tab === 'week' && !focusLogin && (
        <WeekTab
          weekStart={weekStart}
          weekEnd={weekEnd}
          setWeekStart={(v) => setWeekStart(mondayOf(v))}
          weeks={weeks}
          focusLogin={focusLogin}
          onCollect={collect}
          onHealth={checkHealth}
          onPatch={patch}
          onDelete={removeWeek}
          busy={busy}
        />
      )}

      {tab === 'months' && !focusLogin && <MonthsTab weeks={weeks} />}
      {tab === 'overview' && !focusLogin && <OverviewTab weeks={weeks} trainees={trainees} />}
    </div>
  )
}

/* ===================== Фокус-вид стажёра ===================== */
function TraineeFocus({
  trainee,
  weeks,
  onToggleStage,
  onSetStageDate,
  canEdit = true,
}: {
  trainee: Trainee
  weeks: Record<string, WeekData>
  onToggleStage: (key: string) => void
  onSetStageDate: (key: string, date: string) => void
  canEdit?: boolean
}) {
  const [open, setOpen] = useState(false)
  const stages = trainee.stages || []
  const stage = currentStage(stages)
  const days = daysWithUs(trainee.startDate)

  // Динамика: все недели, где есть строка по этому стажёру, по возрастанию недели.
  const dyn = useMemo(() => {
    const list: { key: string; row: WeekRow }[] = []
    for (const [key, wk] of Object.entries(weeks)) {
      const row = wk.rows[trainee.login]
      if (row) list.push({ key, row })
    }
    return list.sort((a, b) => (a.row.weekNum ?? 0) - (b.row.weekNum ?? 0) || a.key.localeCompare(b.key))
  }, [weeks, trainee.login])

  // Авто-определение реального выхода в тикеты — первая неделя с тикетной активностью.
  const autoTicketsDate = useMemo(() => {
    const hit = [...dyn].sort((a, b) => a.key.localeCompare(b.key)).find(({ row }) => (row.esche || 0) > 0 || (row.otvety || 0) > 0)
    return hit?.key
  }, [dyn])

  // Эффективная дата этапа (ручная или авто) и количество дней на этапе.
  const stageDate = (key: string) => trainee.stageDates?.[key] || (key === 'tickets' ? autoTicketsDate : undefined)
  return (
    <>
      {/* Сводка */}
      <div className="trainee-hero">
        <div className="hero-card">
          <div className="hero-card__label">Дата выхода</div>
          <div className="hero-card__value">{trainee.startDate ? fmt(trainee.startDate) : '—'}</div>
        </div>
        <div className="hero-card">
          <div className="hero-card__label">Выход в тикеты</div>
          <div className="hero-card__value" style={{ fontSize: 17 }}>
            {(() => {
              const manual = trainee.stageDates?.tickets
              const eff = manual || autoTicketsDate
              return eff ? fmt(eff) + (!manual ? ' · авто' : '') : '—'
            })()}
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card__label">Дней с нами</div>
          <div className="hero-card__value">{days ?? '—'}</div>
        </div>
        <div className="hero-card">
          <div className="hero-card__label">Текущий этап</div>
          <div className="hero-card__value" style={{ fontSize: 16 }}>{stage ? stage.label : 'Теория / обучение'}</div>
        </div>
        <div className="hero-card">
          <div className="hero-card__label">Группа · наставник</div>
          <div className="hero-card__value" style={{ fontSize: 16 }}>
            {trainee.group}
            {trainee.mentor ? ` · ${trainee.mentor}` : ''}
          </div>
        </div>
      </div>

      {/* Этапы (чек-лист) */}
      <h2 className="section" style={{ marginTop: 0 }}>Этапы онбординга</h2>
      <div className="stage-list">
        {STAGES.map((s, i) => {
          const done = stages.includes(s.key)
          const dated = ['tickets', 'chats', 'phones', 'closed'].includes(s.key)
          const manual = trainee.stageDates?.[s.key] || ''
          // Сколько дней на этапе (для тикетов/чатов/телефонов): от даты этапа до сегодня.
          const showDays = ['tickets', 'chats', 'phones'].includes(s.key)
          const effective = stageDate(s.key)
          const days = showDays ? daysWithUs(effective) : null
          const isAuto = s.key === 'tickets' && !manual && !!autoTicketsDate
          return (
            <div key={s.key} className={'stage-item' + (done ? ' stage-item--done' : '')}>
              <span className="stage-item__num">{i + 1}</span>
              <input className="chk" type="checkbox" checked={done} disabled={!canEdit} onChange={() => onToggleStage(s.key)} />
              <span className="stage-item__text">
                <span className="stage-item__title">{s.label}</span>
                <span className="stage-item__hint"> — {s.hint}</span>
              </span>
              {days != null && (
                <span className="stage-item__days" title={isAuto ? 'Авто: по первой неделе с тикетами' : 'От даты этапа'}>
                  {days} дн.{isAuto ? ' · авто' : ''}
                </span>
              )}
              {dated && (
                <input
                  className="stage-item__date"
                  type="date"
                  disabled={!canEdit}
                  value={manual || (isAuto ? autoTicketsDate! : '')}
                  onChange={(e) => onSetStageDate(s.key, e.target.value)}
                  title={isAuto ? 'Авто-дата по данным; измени, если нужно' : 'Дата этапа'}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Динамика */}
      <h2 className="section" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="chart" size={18} /> Динамика по неделям
        <div className="toolbar__spacer" />
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)} disabled={!dyn.length}>
          <Icon name="external" size={14} /> Открыть для скриншота
        </button>
      </h2>
      {dyn.length === 0 ? (
        <div className="muted">Пока нет собранных недель по этому стажёру.</div>
      ) : (
        <DynamicsTable name={trainee.name} group={trainee.group} dyn={dyn} />
      )}

      {open && (
        <Modal title={`Динамика — ${trainee.name}`} onClose={() => setOpen(false)}>
          <DynamicsTable name={trainee.name} group={trainee.group} dyn={dyn} />
        </Modal>
      )}
    </>
  )
}

function DynamicsTable({ name, group, dyn }: { name: string; group: Group; dyn: { key: string; row: WeekRow }[] }) {
  return (
    <div className="table-wrap">
      <table className="stat">
        <thead>
          <tr>
            <th className="stat__sticky">Неделя</th>
            <th>Период</th>
            <th>Дисц.</th>
            <th>Скорость</th>
            <th>Качество %</th>
            <th>Ещё тикет</th>
            <th>Ответы</th>
            <th>Передачи %</th>
            <th>Отложка %</th>
            <th>Коммент.</th>
          </tr>
        </thead>
        <tbody>
          {dyn.map(({ key, row }) => {
            const week = row.weekNum ?? null
            const speed = speedOf(row)
            const quality = qualityOf(row)
            return (
              <tr key={key}>
                <td className="stat__sticky">
                  <div className="stat__name">Неделя {week ?? '—'}</div>
                </td>
                <td className="muted">{fmt(key)} – {fmt(addDays(key, 4))}</td>
                <td className={tone(disciplineTone(row.discipline))}>{row.discipline ?? '—'}</td>
                <td className={tone(speedTone(speed ?? null, week, group))}>{speed ?? '—'}</td>
                <td className={tone(qualityTone(quality, week))}>{quality ?? '—'}</td>
                <td>{row.esche}</td>
                <td>{row.otvety}</td>
                <td className={tone(pctTone(row.peredachiPct))}>{row.peredachiPct}</td>
                <td className={tone(pctTone(row.otlozhkaPct))}>{row.otlozhkaPct}</td>
                <td className="muted">{row.comment || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="muted" style={{ marginTop: 6 }}>{name} · {dyn.length} нед.</div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__title">{title}</span>
          <div className="toolbar__spacer" />
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            <Icon name="close" size={14} /> Закрыть
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}

/* ===================== По неделям (группировка по месяцам, сворачивание) ===================== */
function WeekTab(props: {
  weekStart: string
  weekEnd: string
  setWeekStart: (v: string) => void
  weeks: Record<string, WeekData>
  focusLogin?: string
  onCollect: () => void
  onHealth: () => void
  onPatch: (weekKey: string, login: string, field: keyof WeekRow, value: number | string | undefined) => void
  onDelete: (weekKey: string) => void
  busy: string
}) {
  const { weekStart, weekEnd, setWeekStart, weeks, focusLogin, onCollect, onHealth, onPatch, onDelete, busy } = props

  // Сгруппировать недели по месяцам (свежее сверху).
  const months = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const key of Object.keys(weeks).sort((a, b) => b.localeCompare(a))) {
      const mk = key.slice(0, 7)
      if (!map.has(mk)) map.set(mk, [])
      map.get(mk)!.push(key)
    }
    return [...map.entries()]
  }, [weeks])

  // Открытым по умолчанию — самый свежий месяц.
  const [open, setOpen] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (months.length) setOpen((prev) => (prev.size ? prev : new Set([months[0][0]])))
  }, [months])
  const toggle = (mk: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(mk) ? next.delete(mk) : next.add(mk)
      return next
    })

  return (
    <>
      <div className="toolbar">
        <Field label="Неделя (понедельник)" inline>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </Field>
        <span className="muted">
          → {fmt(weekStart)} – {fmt(weekEnd)}
        </span>
        <div className="toolbar__spacer" />
        <button className="btn" onClick={onCollect} disabled={busy === 'collect'}>
          <Icon name="inbox" size={16} /> {busy === 'collect' ? 'Собираю…' : 'Собрать неделю'}
        </button>
        <button className="btn btn--ghost" onClick={onHealth} disabled={busy === 'health'}>
          <Icon name="refresh" size={16} /> Проверить Grafana
        </button>
      </div>

      {months.length === 0 && (
        <div className="muted">Пока нет собранных недель. Выбери понедельник и нажми «Собрать неделю».</div>
      )}

      {months.map(([mk, keys]) => {
        const isOpen = open.has(mk)
        return (
          <div className="month-block" key={mk}>
            <button className="month-block__head" onClick={() => toggle(mk)}>
              <Icon name={isOpen ? 'folderOpen' : 'folder'} size={18} />
              <span className="month-block__title">{monthName(mk)}</span>
              <span className="chapter__count">{keys.length} нед.</span>
              <div className="toolbar__spacer" />
              <Icon name={isOpen ? 'close' : 'plus'} size={16} />
            </button>

            {isOpen && (
              <div className="month-block__body">
                {keys.map((key) => {
                  const wk = weeks[key]
                  const rows = Object.entries(wk.rows)
                    .filter(([login]) => !focusLogin || login === focusLogin)
                    .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''))
                  if (focusLogin && rows.length === 0) return null
                  return (
                    <div className="week-block" key={key}>
                      <div className="week-block__head">
                        <Icon name="calendar" size={15} />
                        <span className="week-block__period">
                          {fmt(key)} – {fmt(addDays(key, 4))}
                        </span>
                        <span className="muted">обновлено {new Date(wk.collectedAt).toLocaleString('ru-RU')}</span>
                        <div className="toolbar__spacer" />
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => exportWeekCsv(key, rows)}
                          disabled={!rows.length}
                        >
                          <Icon name="download" size={14} /> Выгрузить
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => onDelete(key)} title="Удалить неделю">
                          <Icon name="trash" size={14} /> Удалить
                        </button>
                      </div>
                      <StatTable rows={rows} weekKey={key} onPatch={onPatch} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className="legend">
        <span className="muted">
          Качество — авто из проверок стажёра (% без ошибок); чтобы вписать оценку КК, введи значение в ячейку
          (переопределяет авто). Дисциплину вноси вручную; скорость можно переопределить. Цвета Скорости/Качества — по
          норме недели обучения (для скорости учитывается группа); Передачи %/Отложка %: ≤30 хорошо, 30–40 средне,
          &gt;40 плохо.
        </span>
      </div>
    </>
  )
}

function StatTable({
  rows,
  weekKey,
  onPatch,
}: {
  rows: [string, WeekRow][]
  weekKey: string
  onPatch: (weekKey: string, login: string, field: keyof WeekRow, value: number | string | undefined) => void
}) {
  return (
    <div className="table-wrap">
      <table className="stat">
        <thead>
          <tr>
            <th className="stat__sticky">Стажёр</th>
            <th>Нед.</th>
            <th>Группа</th>
            <th>Дисц.</th>
            <th>Скорость</th>
            <th>Качество %</th>
            <th>Ещё тикет</th>
            <th>Ответы</th>
            <th>Передачи</th>
            <th>Передачи %</th>
            <th>Отложка %</th>
            <th>Коммент.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="muted" style={{ textAlign: 'center', padding: 16 }}>
                Нет данных по обучающимся за эту неделю.
              </td>
            </tr>
          )}
          {rows.map(([login, row]) => {
            const week = row.weekNum ?? null
            const speed = speedOf(row)
            const quality = qualityOf(row)
            return (
              <tr key={login}>
                <td className="stat__sticky">
                  <div className="stat__name">{row.name}</div>
                  <code className="muted">{login}</code>
                </td>
                <td>{week ?? '—'}</td>
                <td>{row.group}</td>
                <td className={tone(disciplineTone(row.discipline))}>
                  <NumCell value={row.discipline} step={1} onSave={(v) => onPatch(weekKey, login, 'discipline', v)} />
                </td>
                <td className={tone(speedTone(speed ?? null, week, row.group))} title={normHint('Скорость', speedNorm(week, row.group))}>
                  <NumCell value={speed} step={0.1} onSave={(v) => onPatch(weekKey, login, 'speedOverride', v)} placeholder={String(row.speed)} />
                </td>
                <td className={tone(qualityTone(quality, week))} title={(row.qualityChecks ? `Проверок: ${row.qualityChecks}. ` : '') + normHint('Качество', qualityNorm(week))}>
                  <NumCell value={row.quality} step={1} onSave={(v) => onPatch(weekKey, login, 'quality', v)} placeholder={row.qualityAuto != null ? String(row.qualityAuto) : '—'} />
                </td>
                <td>{row.esche}</td>
                <td>{row.otvety}</td>
                <td>{row.peredachi}</td>
                <td className={tone(pctTone(row.peredachiPct))}>{row.peredachiPct}</td>
                <td className={tone(pctTone(row.otlozhkaPct))}>{row.otlozhkaPct}</td>
                <td>
                  <input
                    className="cell-input cell-input--wide"
                    defaultValue={row.comment || ''}
                    placeholder="…"
                    onBlur={(e) => onPatch(weekKey, login, 'comment', e.target.value)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ===================== По месяцам ===================== */
function MonthsTab({ weeks }: { weeks: Record<string, WeekData> }) {
  const months = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const key of Object.keys(weeks)) {
      const mk = key.slice(0, 7)
      if (!map.has(mk)) map.set(mk, [])
      map.get(mk)!.push(key)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [weeks])

  if (months.length === 0) return <div className="muted">Пока нет собранных недель.</div>

  return (
    <>
      {months.map(([mk, wkeys]) => {
        const agg = aggregateMonth(weeks, wkeys)
        return (
          <div key={mk} style={{ marginBottom: 24 }}>
            <h2 className="section" style={{ marginTop: 0, textTransform: 'capitalize' }}>
              {monthName(mk)} <span className="muted" style={{ fontWeight: 400 }}>· недель: {wkeys.length}</span>
            </h2>
            <div className="table-wrap">
              <table className="stat">
                <thead>
                  <tr>
                    <th className="stat__sticky">Стажёр</th>
                    <th>Группа</th>
                    <th>Σ Дисц.</th>
                    <th>Ср. скорость</th>
                    <th>Ср. качество %</th>
                    <th>Ср. ответы</th>
                    <th>Ср. передачи %</th>
                    <th>Ср. отложка %</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.map((a) => (
                    <tr key={a.login}>
                      <td className="stat__sticky">
                        <div className="stat__name">{a.name}</div>
                        <code className="muted">{a.login}</code>
                      </td>
                      <td>{a.group}</td>
                      <td className={tone(disciplineTone(a.discipline))}>{a.discipline}</td>
                      <td>{a.speed}</td>
                      <td>{a.quality ?? '—'}</td>
                      <td>{a.otvety}</td>
                      <td className={tone(pctTone(a.peredachiPct))}>{a.peredachiPct}</td>
                      <td className={tone(pctTone(a.otlozhkaPct))}>{a.otlozhkaPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </>
  )
}

function aggregateMonth(weeks: Record<string, WeekData>, wkeys: string[]) {
  const acc = new Map<string, any>()
  for (const wk of wkeys) {
    for (const [login, r] of Object.entries(weeks[wk]?.rows || {})) {
      if (!acc.has(login)) acc.set(login, { name: r.name, group: r.group, n: 0, speed: 0, otvety: 0, per: 0, otl: 0, disc: 0, qN: 0, qSum: 0 })
      const a = acc.get(login)
      a.n++
      a.speed += speedOf(r) ?? 0
      a.otvety += r.otvety ?? 0
      a.per += r.peredachiPct ?? 0
      a.otl += r.otlozhkaPct ?? 0
      a.disc += r.discipline ?? 0
      const q = qualityOf(r)
      if (q != null) {
        a.qSum += q
        a.qN++
      }
    }
  }
  const r1 = (x: number) => Math.round(x * 10) / 10
  return [...acc.entries()]
    .map(([login, a]) => ({
      login,
      name: a.name,
      group: a.group,
      discipline: a.disc,
      speed: r1(a.speed / a.n),
      quality: a.qN ? r1(a.qSum / a.qN) : null,
      otvety: Math.round(a.otvety / a.n),
      peredachiPct: r1(a.per / a.n),
      otlozhkaPct: r1(a.otl / a.n),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ===================== Общая статистика (фильтры) ===================== */
function OverviewTab({ weeks, trainees }: { weeks: Record<string, WeekData>; trainees: Trainee[] }) {
  const [month, setMonth] = useState<string>('all')
  const [group, setGroup] = useState<string>('all')
  const [mentor, setMentor] = useState<string>('all')
  const [lead, setLead] = useState<string>('all')
  const [pick, setPick] = useState<Set<string>>(new Set()) // выбранные стажёры (пусто = все)

  const tMap = useMemo(() => {
    const m = new Map<string, Trainee>()
    trainees.forEach((t) => m.set(t.login, t))
    return m
  }, [trainees])

  const monthOptions = useMemo(
    () => [...new Set(Object.keys(weeks).map((k) => k.slice(0, 7)))].sort((a, b) => b.localeCompare(a)),
    [weeks],
  )
  const mentorOptions = useMemo(() => uniqSorted(trainees.map((t) => t.mentor)), [trainees])
  const leadOptions = useMemo(() => uniqSorted(trainees.map((t) => t.lead)), [trainees])

  // Кандидаты в выбор стажёров — с учётом фильтров группы/наставника/лида.
  const candidates = useMemo(
    () =>
      trainees
        .filter((t) => group === 'all' || t.group === group)
        .filter((t) => mentor === 'all' || t.mentor === mentor)
        .filter((t) => lead === 'all' || t.lead === lead)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [trainees, group, mentor, lead],
  )
  const candidateLogins = useMemo(() => new Set(candidates.map((t) => t.login)), [candidates])

  // Агрегация по стажёру с учётом всех фильтров.
  const rows = useMemo(() => {
    const acc = new Map<string, any>()
    for (const [key, wk] of Object.entries(weeks)) {
      if (month !== 'all' && key.slice(0, 7) !== month) continue
      for (const [login, r] of Object.entries(wk.rows)) {
        if (!candidateLogins.has(login)) continue
        if (pick.size && !pick.has(login)) continue
        const t = tMap.get(login)
        if (!acc.has(login))
          acc.set(login, {
            login,
            name: r.name,
            group: r.group,
            mentor: t?.mentor || '—',
            lead: t?.lead || '—',
            n: 0, speed: 0, per: 0, otl: 0, otvety: 0, disc: 0, qN: 0, qSum: 0,
          })
        const a = acc.get(login)
        a.n++
        a.speed += speedOf(r) ?? 0
        a.per += r.peredachiPct ?? 0
        a.otl += r.otlozhkaPct ?? 0
        a.otvety += r.otvety ?? 0
        a.disc += r.discipline ?? 0
        const q = qualityOf(r)
        if (q != null) {
          a.qSum += q
          a.qN++
        }
      }
    }
    const r1 = (x: number) => Math.round(x * 10) / 10
    return [...acc.values()]
      .map((a) => ({
        login: a.login, name: a.name, group: a.group, mentor: a.mentor, lead: a.lead,
        weeks: a.n,
        speed: r1(a.speed / a.n),
        quality: a.qN ? r1(a.qSum / a.qN) : null,
        otvety: Math.round(a.otvety / a.n),
        peredachiPct: r1(a.per / a.n),
        otlozhkaPct: r1(a.otl / a.n),
        discipline: a.disc,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [weeks, month, candidateLogins, pick, tMap])

  function exportCsv() {
    const head = ['Стажёр', 'Логин', 'Группа', 'Наставник', 'Лид', 'Недель', 'Ср. скорость', 'Ср. качество %', 'Ср. ответы', 'Ср. передачи %', 'Ср. отложка %', 'Σ дисциплина']
    const lines = rows.map((r) => [r.name, r.login, r.group, r.mentor, r.lead, r.weeks, r.speed, r.quality ?? '', r.otvety, r.peredachiPct, r.otlozhkaPct, r.discipline])
    downloadCsv(`общая_статистика_${month}.csv`, head, lines)
  }

  const togglePick = (login: string) =>
    setPick((prev) => {
      const next = new Set(prev)
      next.has(login) ? next.delete(login) : next.add(login)
      return next
    })
  const resetFilters = () => {
    setMonth('all'); setGroup('all'); setMentor('all'); setLead('all'); setPick(new Set())
  }

  return (
    <>
      <div className="form-card">
        <div className="form-card__title">Фильтры</div>
        <div className="form-grid">
          <Field label="Период (месяц)">
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">Все месяцы</option>
              {monthOptions.map((mk) => (
                <option key={mk} value={mk}>{monthName(mk)}</option>
              ))}
            </select>
          </Field>
          <Field label="Группа">
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">Все группы</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Наставник">
            <select value={mentor} onChange={(e) => setMentor(e.target.value)}>
              <option value="all">Все наставники</option>
              {mentorOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Лид">
            <select value={lead} onChange={(e) => setLead(e.target.value)}>
              <option value="all">Все лиды</option>
              {leadOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="field" style={{ marginTop: 4 }}>
          <label>Стажёры {pick.size ? `(выбрано ${pick.size})` : '(все подходящие)'}</label>
          <div className="pick-list">
            {candidates.length === 0 && <span className="muted">Нет стажёров под фильтры.</span>}
            {candidates.map((t) => (
              <label key={t.login} className={'pick' + (pick.has(t.login) ? ' pick--on' : '')}>
                <input className="chk" type="checkbox" checked={pick.has(t.login)} onChange={() => togglePick(t.login)} />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-card__foot">
          <button className="btn btn--ghost btn--sm" onClick={resetFilters}>Сбросить фильтры</button>
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>
            <Icon name="download" size={16} /> Выгрузить (CSV)
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="muted">Нет данных под выбранные фильтры.</div>
      ) : (
        <div className="table-wrap">
          <table className="stat">
            <thead>
              <tr>
                <th className="stat__sticky">Стажёр</th>
                <th>Группа</th>
                <th>Наставник</th>
                <th>Лид</th>
                <th>Недель</th>
                <th>Ср. скорость</th>
                <th>Ср. качество %</th>
                <th>Ср. ответы</th>
                <th>Ср. передачи %</th>
                <th>Ср. отложка %</th>
                <th>Σ дисц.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.login}>
                  <td className="stat__sticky">
                    <div className="stat__name">{r.name}</div>
                    <code className="muted">{r.login}</code>
                  </td>
                  <td>{r.group}</td>
                  <td>{r.mentor}</td>
                  <td>{r.lead}</td>
                  <td>{r.weeks}</td>
                  <td>{r.speed}</td>
                  <td>{r.quality ?? '—'}</td>
                  <td>{r.otvety}</td>
                  <td className={tone(pctTone(r.peredachiPct))}>{r.peredachiPct}</td>
                  <td className={tone(pctTone(r.otlozhkaPct))}>{r.otlozhkaPct}</td>
                  <td className={tone(disciplineTone(r.discipline))}>{r.discipline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ===================== Стажёры ===================== */
function TraineesTab({
  trainees,
  meta,
  onChange,
  onMeta,
}: {
  trainees: Trainee[]
  meta: Meta
  onChange: (t: Trainee[]) => void
  onMeta: (m: Meta) => void
}) {
  const empty = (): Trainee => ({ id: uid(), name: '', login: '', group: 'Л1', mentor: '', lead: '', startDate: '', comment: '' })
  const [draft, setDraft] = useState<Trainee>(empty())
  const [sub, setSub] = useState<'learning' | 'finished' | 'fired'>('learning')
  const [manageOpen, setManageOpen] = useState(false)

  const ensureMeta = (t: Partial<Trainee>) => {
    let { mentors, leads } = meta
    if (t.mentor && !mentors.includes(t.mentor)) mentors = [...mentors, t.mentor].sort()
    if (t.lead && !leads.includes(t.lead)) leads = [...leads, t.lead].sort()
    if (mentors !== meta.mentors || leads !== meta.leads) onMeta({ mentors, leads })
  }

  const add = () => {
    if (!draft.name.trim() || !draft.login.trim()) return
    ensureMeta(draft)
    onChange([...trainees, draft])
    setDraft(empty())
  }
  const update = (id: string, patch: Partial<Trainee>) => {
    ensureMeta(patch)
    onChange(trainees.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  const remove = (id: string) => onChange(trainees.filter((t) => t.id !== id))

  const learning = trainees.filter((t) => isActive(t))
  const finished = trainees.filter((t) => t.closedIS && !t.fired)
  const fired = trainees.filter((t) => t.fired)
  const sections = {
    learning: { items: learning, muted: false },
    finished: { items: finished, muted: true },
    fired: { items: fired, muted: true },
  }
  const cur = sections[sub]

  return (
    <>
      <div className="form-card">
        <div className="form-card__title">Добавить стажёра</div>
        <div className="form-grid">
          <Field label="Фамилия Имя">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Иванов Иван" />
          </Field>
          <Field label="Логин в Staff">
            <input value={draft.login} onChange={(e) => setDraft({ ...draft, login: e.target.value })} placeholder="i.ivanov" />
          </Field>
          <Field label="Группа">
            <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })}>
              {GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Наставник">
            <SelectOrNew value={draft.mentor || ''} options={meta.mentors} onChange={(v) => setDraft({ ...draft, mentor: v })} />
          </Field>
          <Field label="Лид">
            <SelectOrNew value={draft.lead || ''} options={meta.leads} onChange={(v) => setDraft({ ...draft, lead: v })} />
          </Field>
          <Field label="Дата выхода (реальная)">
            <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
          </Field>
        </div>

        {/* Управление справочниками наставников и лидов — внутри подраздела добавления */}
        <button className="link-toggle" onClick={() => setManageOpen((v) => !v)}>
          <Icon name={manageOpen ? 'close' : 'gear'} size={14} />
          {manageOpen ? 'Скрыть управление наставниками и лидами' : 'Управлять списками наставников и лидов'}
        </button>
        {manageOpen && (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <MetaList label="Наставники" items={meta.mentors} onChange={(mentors) => onMeta({ ...meta, mentors })} />
            <MetaList label="Лиды" items={meta.leads} onChange={(leads) => onMeta({ ...meta, leads })} />
          </div>
        )}

        <div className="form-card__foot">
          <span className="muted">Выход с ИС (авто): {draft.startDate ? fmt(endISDate(draft.startDate)!) : '— укажи дату выхода'}</span>
          <button className="btn" onClick={add} disabled={!draft.name.trim() || !draft.login.trim()}>
            <Icon name="plus" size={16} /> Добавить
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 18 }}>
        <button className={'tab' + (sub === 'learning' ? ' tab--on' : '')} onClick={() => setSub('learning')}>
          <Icon name="graduation" size={15} /> Обучаются ({learning.length})
        </button>
        <button className={'tab' + (sub === 'finished' ? ' tab--on' : '')} onClick={() => setSub('finished')}>
          <Icon name="check" size={15} /> Закончил ИС ({finished.length})
        </button>
        <button className={'tab' + (sub === 'fired' ? ' tab--on' : '')} onClick={() => setSub('fired')}>
          <Icon name="close" size={15} /> Уволился ({fired.length})
        </button>
      </div>

      <TraineeSection items={cur.items} meta={meta} update={update} remove={remove} muted={cur.muted} />
    </>
  )
}

function TraineeSection({
  items,
  meta,
  update,
  remove,
  muted,
}: {
  items: Trainee[]
  meta: Meta
  update: (id: string, p: Partial<Trainee>) => void
  remove: (id: string) => void
  muted?: boolean
}) {
  return (
    <div className="trainee-list">
      {items.length === 0 && <div className="muted">Пусто.</div>}
      {items.map((t) => (
        <div className={'trainee-card' + (muted ? ' trainee-card--off' : '')} key={t.id}>
          <div className="trainee-card__head">
            <div>
              <span className="trainee-card__name">{t.name || '—'}</span>
              <code className="trainee-card__login">{t.login}</code>
              <span className="chip">{t.group}</span>
              {t.fired && <span className="chip chip--off">Уволен {fmt(t.fired)}</span>}
              {t.closedIS && !t.fired && <span className="chip chip--off">ИС закрыт {fmt(t.closedIS)}</span>}
            </div>
            <button className="tag-remove" title="Удалить" onClick={() => remove(t.id)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="trainee-card__grid">
            <Field label="Группа">
              <select value={t.group} onChange={(e) => update(t.id, { group: e.target.value })}>
                {GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Наставник">
              <SelectOrNew value={t.mentor || ''} options={meta.mentors} onChange={(v) => update(t.id, { mentor: v })} />
            </Field>
            <Field label="Лид">
              <SelectOrNew value={t.lead || ''} options={meta.leads} onChange={(v) => update(t.id, { lead: v })} />
            </Field>
            <Field label="Дата выхода">
              <input type="date" value={t.startDate || ''} onChange={(e) => update(t.id, { startDate: e.target.value })} />
            </Field>
            <Field label="Выход с ИС (авто)">
              <input value={endISDate(t.startDate) ? fmt(endISDate(t.startDate)!) : ''} readOnly />
            </Field>
            <Field label="Закрыт ИС">
              <input type="date" value={t.closedIS || ''} onChange={(e) => update(t.id, { closedIS: e.target.value || null })} />
            </Field>
            <Field label="Уволился">
              <input type="date" value={t.fired || ''} onChange={(e) => update(t.id, { fired: e.target.value || null })} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  )
}

function MetaList({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [val, setVal] = useState('')
  const add = () => {
    const v = val.trim()
    if (v && !items.includes(v)) onChange([...items, v].sort())
    setVal('')
  }
  const edit = (i: number, v: string) => onChange(items.map((x, idx) => (idx === i ? v : x)))
  const del = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="field">
      <label>{label}</label>
      <div className="meta-list">
        {items.map((it, i) => (
          <div className="meta-row" key={i}>
            <input value={it} onChange={(e) => edit(i, e.target.value)} />
            <button className="tag-remove" title="Удалить" onClick={() => del(i)}>
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="meta-add">
        <input value={val} placeholder={`+ добавить (${label.toLowerCase()})`} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn--ghost btn--sm" onClick={add}>
          Добавить
        </button>
      </div>
    </div>
  )
}

/* ===================== Мелкие компоненты ===================== */
function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <div className={'field' + (inline ? ' field--inline' : '')}>
      <label>{label}</label>
      {children}
    </div>
  )
}

function SelectOrNew({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [listId] = useState(() => 'dl-' + uid())
  return (
    <>
      <input list={listId} value={value} placeholder="выбрать или ввести нового" onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  )
}

function NumCell({ value, step, onSave, placeholder }: { value?: number; step: number; onSave: (v: number | undefined) => void; placeholder?: string }) {
  return (
    <input
      className="cell-input"
      type="number"
      step={step}
      defaultValue={value ?? ''}
      placeholder={placeholder ?? '—'}
      onBlur={(e) => onSave(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  )
}

const tone = (t: Tone) => (t ? 'cell cell--' + t : 'cell')
const normHint = (label: string, n: number | null) => (n == null ? '' : `Норма ${label.toLowerCase()} этой недели: ${n}`)
const uniqSorted = (arr: (string | undefined)[]) =>
  [...new Set(arr.map((s) => (s || '').trim()).filter(Boolean))].sort()

function downloadCsv(filename: string, header: (string | number)[], rows: (string | number)[][]) {
  const esc = (c: string | number) => `"${String(c ?? '').replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportWeekCsv(key: string, rows: [string, WeekRow][]) {
  const header = ['Стажёр', 'Логин', 'Неделя', 'Группа', 'Дисциплина', 'Скорость', 'Качество %', 'Ещё тикет', 'Ответы', 'Передачи', 'Передачи %', 'Отложка %', 'Комментарий']
  const lines = rows.map(([login, r]) => [
    r.name, login, r.weekNum ?? '', r.group, r.discipline ?? '', speedOf(r) ?? '', qualityOf(r) ?? '',
    r.esche, r.otvety, r.peredachi, r.peredachiPct, r.otlozhkaPct, r.comment ?? '',
  ])
  downloadCsv(`статистика_неделя_${key}.csv`, header, lines)
}
