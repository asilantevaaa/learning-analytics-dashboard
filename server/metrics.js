// Прямые SQL-запросы к Grafana datasources через /api/ds/query.
// Источники и формулы выверены по дашбордам:
//  - тикетные метрики: дашборд поддержки, ds с тикетными событиями
//  - скорость:        дашборд учёта времени, ds с учётом рабочего времени
import { getGrafanaConfig } from './store.js'

const DS_TICKETS = process.env.DS_TICKETS || 'ticketing-datasource-uid'
const DS_SPEED = process.env.DS_SPEED || 'time-tracking-datasource-uid'

// Настройки из «Настроек» (server/data/grafana.json) приоритетнее server/.env.
async function env() {
  const stored = await getGrafanaConfig()
  return {
    url: (stored.url || process.env.GRAFANA_URL || 'https://grafana.example.com').replace(/\/$/, ''),
    token: stored.token || process.env.GRAFANA_TOKEN || '',
  }
}

async function authHeaders() {
  const { token } = await env()
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function sqlList(logins) {
  return logins.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(',')
}

// Выполнить один SQL-запрос (table) к указанному datasource. Возвращает {columns, rows}.
async function runSql(dsUid, rawSql, fromMs, toMs) {
  const { url } = await env()
  const body = {
    from: String(fromMs),
    to: String(toMs),
    queries: [
      {
        refId: 'A',
        datasource: { type: 'mysql', uid: dsUid },
        rawSql,
        format: 'table',
        intervalMs: 60000,
        maxDataPoints: 1000,
      },
    ],
  }
  const res = await fetch(`${url}/api/ds/query`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  const r = data?.results?.A
  if (!res.ok || r?.error) {
    throw new Error(`SQL HTTP ${res.status}: ${r?.error || JSON.stringify(data).slice(0, 200)}`)
  }
  const fr = (r?.frames || [])[0]
  const fields = fr?.schema?.fields || []
  const values = fr?.data?.values || []
  const columns = fields.map((f) => f.name)
  const n = values[0]?.length || 0
  const rows = []
  for (let i = 0; i < n; i++) rows.push(columns.map((_, c) => values[c]?.[i]))
  return { columns, rows }
}

// Привести строки в map по первой колонке (логин).
function byLogin({ columns, rows }) {
  const map = {}
  for (const row of rows) {
    const obj = {}
    columns.forEach((c, i) => (obj[c] = row[i]))
    map[String(row[0])] = obj
  }
  return map
}

const secFrom = (ms) => Math.floor(ms / 1000)

// Тикетные метрики (Ещё тикет, Ответы, Передачи, Отложка) + проценты.
export async function collectTickets(logins, fromMs, toMs) {
  if (!logins.length) return {}
  const list = sqlList(logins)
  const from = secFrom(fromMs)
  const to = secFrom(toMs)

  const answersSql = `
    select executer as login,
      sum(case when type in ('message','review_answer','review') and internal='n' then 1 else 0 end) as otvety,
      sum(case when type='transfer' and internal='n' then 1 else 0 end) as peredachi,
      sum(case when type='delay' then 1 else 0 end) as otlozhka
    from ticketing.ticket_comments
    where date >= from_unixtime(${from}) and date <= from_unixtime(${to})
      and executer in (${list})
    group by executer`

  const escheSql = `
    select changed_by_user as login, count(*) as esche
    from ticketing.ticket_assignment_changes
    where changed_at >= from_unixtime(${from}) and changed_at <= from_unixtime(${to})
      and type='picked' and changed_by_user=new_in_work_user
      and changed_by_user in (${list})
    group by changed_by_user`

  const [aMap, eMap] = await Promise.all([
    runSql(DS_TICKETS, answersSql, fromMs, toMs).then(byLogin),
    runSql(DS_TICKETS, escheSql, fromMs, toMs).then(byLogin),
  ])

  const out = {}
  for (const login of logins) {
    const a = aMap[login] || {}
    const otvety = Number(a.otvety || 0)
    const peredachi = Number(a.peredachi || 0)
    const otlozhka = Number(a.otlozhka || 0)
    const esche = Number((eMap[login] || {}).esche || 0)
    out[login] = {
      esche,
      otvety,
      peredachi,
      otlozhka,
      peredachiPct: otvety ? round1((peredachi / otvety) * 100) : 0, // ПЕРЕДАЧИ / ОТВЕТЫ × 100
      otlozhkaPct: esche ? round1((otlozhka / esche) * 100) : 0, // ОТЛОЖКА / ЕЩЁ ТИКЕТ × 100
    }
  }
  return out
}

// Истинная скорость = тикеты / (взвешенные секунды / 3600).
// Вес work_time: tickets÷1, tickets_chats_calls÷3, остальные тикетные ÷2 (duty исключён).
export async function collectSpeed(logins, fromMs, toMs) {
  if (!logins.length) return {}
  const list = sqlList(logins)
  const from = secFrom(fromMs)
  const to = secFrom(toMs)
  const sql = `
    select tm.username as login,
      sum(kpi.tickets) as tickets,
      sum(case tm.activity
        when 'tickets' then kpi.work_time
        when 'tickets_chats_calls' then kpi.work_time/3
        else kpi.work_time/2 end) as wsec
    from ticketing.ticket_kpi as kpi
    join hr.time_tracking as tm on kpi.time_tracking_id=tm.id
    where tm.started_at >= from_unixtime(${from}) and tm.started_at <= from_unixtime(${to})
      and tm.username in (${list})
      and tm.activity in ('tickets','tickets_calls','tickets_chats','tickets_other','tickets_chats_calls')
    group by tm.username`

  const map = byLogin(await runSql(DS_SPEED, sql, fromMs, toMs))
  const out = {}
  for (const login of logins) {
    const r = map[login]
    out[login] = {
      kpiTickets: Number(r?.tickets || 0), // из kpi.tickets (часто не заполнено)
      weightedSec: Number(r?.wsec || 0), // взвешенное «живое» время — знаменатель скорости
    }
  }
  return out
}

// Истинная скорость = тикеты_в_работе / взвешенные_часы.
// Числитель: kpi.tickets если заполнено, иначе «Ещё тикет» (picked) как надёжный аналог.
export function computeSpeed(escheTickets, speedRaw) {
  const hours = (speedRaw?.weightedSec || 0) / 3600
  if (!hours) return 0
  const num = speedRaw?.kpiTickets || escheTickets || 0
  return round2(num / hours)
}

// Качество (проверки стажёра): % без ошибок из таблицы проверок стажёров.
export async function collectQuality(logins, fromMs, toMs) {
  if (!logins.length) return {}
  const list = sqlList(logins)
  const from = secFrom(fromMs)
  const to = secFrom(toMs)
  const sql = `
    select trainee as login,
      count(id) as checks,
      round(sum(case when status='approved' then 1 else 0 end) * 100 / count(id)) as quality
    from ticketing.trainee_reviews
    where created_at >= from_unixtime(${from}) and created_at <= from_unixtime(${to})
      and trainee in (${list})
    group by trainee`
  const map = byLogin(await runSql(DS_TICKETS, sql, fromMs, toMs))
  const out = {}
  for (const login of logins) {
    const r = map[login]
    out[login] = { qualityChecks: Number(r?.checks || 0), qualityAuto: r?.quality == null ? null : Number(r.quality) }
  }
  return out
}

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100

export { DS_TICKETS, DS_SPEED }
