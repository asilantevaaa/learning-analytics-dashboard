// Логика обращения к Grafana API.
// Подход: читаем JSON дашборда по UID, достаём запросы панелей и их datasource,
// затем повторяем их через /api/ds/query с подстановкой фильтра (логины) и периода.

const env = () => ({
  url: (process.env.GRAFANA_URL || 'https://grafana.example.com').replace(/\/$/, ''),
  token: process.env.GRAFANA_TOKEN || '',
  queueVar: process.env.QUEUE_VAR || 'queue',
})

function authHeaders() {
  const { token } = env()
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export async function health() {
  const { url } = env()
  const res = await fetch(`${url}/api/health`, { headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, version: data.version, commit: data.commit }
}

// Получить JSON дашборда по UID.
async function getDashboard(uid) {
  const { url } = env()
  const res = await fetch(`${url}/api/dashboards/uid/${encodeURIComponent(uid)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Дашборд ${uid}: HTTP ${res.status}`)
  const json = await res.json()
  return json.dashboard
}

// Развернуть вложенные панели (строки/группы содержат panels внутри).
function flattenPanels(panels = []) {
  const out = []
  for (const p of panels) {
    if (Array.isArray(p.panels) && p.panels.length) out.push(...flattenPanels(p.panels))
    if (p.type && p.type !== 'row') out.push(p)
  }
  return out
}

// Подставить значение фильтра в строковые поля таргета ($queue, ${queue}, [[queue]]).
function applyFilter(obj, queueVar, value) {
  const patterns = [
    new RegExp(`\\$\\{${queueVar}(?::[a-zA-Z]+)?\\}`, 'g'),
    new RegExp(`\\$${queueVar}\\b`, 'g'),
    new RegExp(`\\[\\[${queueVar}(?::[a-zA-Z]+)?\\]\\]`, 'g'),
  ]
  const replace = (s) => patterns.reduce((acc, re) => acc.replace(re, value), s)
  const walk = (v) => {
    if (typeof v === 'string') return replace(v)
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o = {}
      for (const k of Object.keys(v)) o[k] = walk(v[k])
      return o
    }
    return v
  }
  return walk(obj)
}

// Привести datasource панели к виду {uid, type}.
function normalizeDatasource(ds, dashboard) {
  if (!ds) return null
  if (typeof ds === 'string') {
    // строковое имя или ${DS} — пытаемся взять дефолтную переменную дашборда
    if (ds.startsWith('$')) {
      const varName = ds.replace(/[${}]/g, '')
      const tv = (dashboard.templating?.list || []).find((t) => t.name === varName)
      const cur = tv?.current?.value
      if (cur && typeof cur === 'object') return { uid: cur.uid, type: cur.type }
      if (typeof cur === 'string') return { uid: cur }
      return null
    }
    return { uid: ds }
  }
  if (ds.uid && ds.uid.startsWith?.('$')) {
    const varName = ds.uid.replace(/[${}]/g, '')
    const tv = (dashboard.templating?.list || []).find((t) => t.name === varName)
    const cur = tv?.current?.value
    if (cur && typeof cur === 'object') return { uid: cur.uid, type: cur.type || ds.type }
  }
  return { uid: ds.uid, type: ds.type }
}

// Экранировать и обернуть значение(я) в SQL-строки, как делает Grafana
// для multi-value переменной в конструкции IN ($queue) → 'a','b'.
function sqlQuoteList(value) {
  const arr = Array.isArray(value) ? value : [value]
  return arr
    .filter((v) => v != null && v !== '')
    .map((v) => `'${String(v).replace(/'/g, "''")}'`)
    .join(',')
}

// Выполнить запросы панели через /api/ds/query.
async function runPanel(panel, dashboard, fromMs, toMs, login) {
  const { url, queueVar } = env()
  const targets = (panel.targets || []).filter((t) => !t.hide)
  if (!targets.length) return { title: panel.title, type: panel.type, frames: [], skipped: 'нет запросов' }

  const queries = targets.map((t, i) => {
    const ds = normalizeDatasource(t.datasource || panel.datasource, dashboard)
    let q = { refId: t.refId || String.fromCharCode(65 + i), intervalMs: 60000, maxDataPoints: 1000, ...t }
    if (ds) q.datasource = ds
    return q
  })

  let payload = { from: String(fromMs), to: String(toMs), queries }
  if (login) payload = applyFilter(payload, queueVar, sqlQuoteList(login))

  const res = await fetch(`${url}/api/ds/query`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`панель «${panel.title}»: HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`)

  // Преобразуем frames в таблицы (поля → строки).
  const frames = []
  for (const refId of Object.keys(data.results || {})) {
    for (const fr of data.results[refId].frames || []) {
      const fields = fr.schema?.fields || []
      const values = fr.data?.values || []
      const cols = fields.map((f) => f.name)
      const n = values[0]?.length || 0
      const rows = []
      for (let r = 0; r < n; r++) rows.push(cols.map((_, c) => values[c]?.[r]))
      frames.push({ refId, columns: cols, rows })
    }
  }
  return { title: panel.title, type: panel.type, frames }
}

// Собрать данные по одному дашборду для набора логинов.
export async function collectDashboard(uid, logins, fromMs, toMs) {
  const dashboard = await getDashboard(uid)
  const panels = flattenPanels(dashboard.panels || [])
  const targetLogins = logins && logins.length ? logins : [null]
  const perLogin = []

  for (const login of targetLogins) {
    const panelResults = []
    for (const panel of panels) {
      try {
        panelResults.push(await runPanel(panel, dashboard, fromMs, toMs, login))
      } catch (e) {
        panelResults.push({ title: panel.title, type: panel.type, error: String(e.message || e) })
      }
    }
    perLogin.push({ login, panels: panelResults })
  }

  return { uid, title: dashboard.title, perLogin }
}

export async function collect(uids, logins, fromMs, toMs) {
  const dashboards = []
  const errors = []
  for (const uid of uids) {
    try {
      dashboards.push(await collectDashboard(uid, logins, fromMs, toMs))
    } catch (e) {
      errors.push({ uid, error: String(e.message || e) })
    }
  }
  return { collectedAt: new Date().toISOString(), from: fromMs, to: toMs, logins, dashboards, errors }
}
