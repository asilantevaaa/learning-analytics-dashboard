import 'dotenv/config'
import express from 'express'
import cron from 'node-cron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import bcrypt from 'bcryptjs'
import { health, collectDashboard } from './grafana.js'
import { collectTickets, collectSpeed, collectQuality, computeSpeed } from './metrics.js'
import {
  getTrainees,
  setTrainees,
  getActiveTrainees,
  getMeta,
  setMeta,
  getSettings,
  setSettings,
  getWeeks,
  getWeek,
  saveWeek,
  deleteWeek,
  patchWeekRow,
  getUsers,
  setUsers,
  getBoards,
  setBoards,
} from './store.js'
import { login, logout, userFromReq, allowedLogins, can } from './auth.js'

// Оставить в снапшоте недели только разрешённые пользователю логины.
function scopeWeek(week, logins) {
  if (!week || logins === null) return week
  const set = new Set(logins)
  const rows = {}
  for (const [login, r] of Object.entries(week.rows || {})) if (set.has(login)) rows[login] = r
  return { ...week, rows }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '1mb' }))

const PORT = process.env.PORT || 8787

// ===== Даты / недели (всё в локальном времени сервера, без UTC-сдвига) =====
const DAY = 86400000
// Локальная дата 'YYYY-MM-DD' (а не toISOString, который уводит в UTC).
function localIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d) // локальная полночь
}
function mondayOf(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}
const mondayIsoOf = (d) => localIso(mondayOf(d))
// Диапазон недели с часовыми границами: Пн startHour:00 → Пт endHour:00.
function weekRange(mondayIso, startHour = 9, endHour = 18) {
  const mon = mondayOf(parseIso(mondayIso))
  const from = new Date(mon)
  from.setHours(startHour, 0, 0, 0)
  const fri = new Date(mon.getTime() + 4 * DAY)
  fri.setHours(endHour, 0, 0, 0)
  return { from: from.getTime(), to: fri.getTime() }
}
// Номер недели обучения стажёра (1 = неделя его выхода).
function traineeWeekNum(startDate, weekMondayMs) {
  if (!startDate) return null
  const start = mondayOf(parseIso(startDate)).getTime()
  const diff = Math.round((weekMondayMs - start) / (7 * DAY))
  return diff + 1
}

// Стажёры, которые обучались в течение данной недели:
// вышли на/до пятницы недели и не завершили/уволились до её понедельника.
function traineesInWeek(all, mondayIso) {
  const fridayIso = localIso(new Date(mondayOf(parseIso(mondayIso)).getTime() + 4 * DAY))
  return all.filter((t) => {
    if (!t.login || !t.startDate) return false
    if (t.startDate > fridayIso) return false // ещё не вышел в этот момент
    if (t.fired && t.fired < mondayIso) return false // уволился до недели
    if (t.closedIS && t.closedIS < mondayIso) return false // закрыл ИС до недели
    return true
  })
}

// ===== Сбор недели по стажёрам, обучавшимся в эту неделю =====
async function collectWeek(mondayIso, { startHour = 9, endHour = 18 } = {}, save = true) {
  const { from, to } = weekRange(mondayIso, startHour, endHour)
  const trainees = traineesInWeek(await getTrainees(), mondayIso)
  const logins = trainees.map((t) => t.login)
  const rows = {}
  if (logins.length) {
    const [tickets, speeds, quality] = await Promise.all([
      collectTickets(logins, from, to),
      collectSpeed(logins, from, to),
      collectQuality(logins, from, to),
    ])
    for (const t of trainees) {
      const tk = tickets[t.login] || {}
      const sp = speeds[t.login] || {}
      const q = quality[t.login] || {}
      rows[t.login] = {
        name: t.name,
        group: t.group || '',
        mentor: t.mentor || '',
        weekNum: traineeWeekNum(t.startDate, from),
        esche: tk.esche || 0,
        otvety: tk.otvety || 0,
        peredachi: tk.peredachi || 0,
        otlozhka: tk.otlozhka || 0,
        peredachiPct: tk.peredachiPct || 0,
        otlozhkaPct: tk.otlozhkaPct || 0,
        weightedHours: Math.round(((sp.weightedSec || 0) / 3600) * 10) / 10,
        speed: computeSpeed(tk.esche || 0, sp),
        qualityAuto: q.qualityAuto ?? null, // % без ошибок (проверки стажёра)
        qualityChecks: q.qualityChecks || 0,
      }
    }
  }
  const week = { from, to, collectedAt: new Date().toISOString(), rows }
  return save ? saveWeek(mondayIso, week) : week
}

// ===== Аутентификация =====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {}
  const result = await login(String(username || ''), String(password || ''))
  if (!result) return res.status(401).json({ error: 'Неверный логин или пароль' })
  res.json(result)
})

// Привязать пользователя к запросу.
app.use(async (req, _res, next) => {
  req.user = await userFromReq(req)
  next()
})

app.post('/api/logout', (req, res) => {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) logout(h.slice(7))
  res.json({ ok: true })
})

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  const u = req.user
  res.json({ id: u.id, username: u.username, role: u.role, name: u.name || u.username, mentor: u.mentor || null, login: u.login || null })
})

// Все /api/* (кроме login/health) требуют авторизации.
app.use('/api', (req, res, next) => {
  if (req.path === '/login' || req.path === '/health') return next()
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  next()
})

const requireDirector = (req, res, next) =>
  can.manageAll(req.user) ? next() : res.status(403).json({ error: 'Недостаточно прав' })

// ===== Health =====
app.get('/api/health', async (_req, res) => {
  try {
    res.json(await health())
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) })
  }
})

// ===== Пользователи (только руководитель) =====
app.get('/api/users', requireDirector, async (_req, res) => {
  const users = await getUsers()
  res.json(users.map((u) => ({ id: u.id, username: u.username, role: u.role, name: u.name || '', mentor: u.mentor || '', login: u.login || '' })))
})
app.put('/api/users', requireDirector, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.users
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Ожидается массив пользователей' })
  // не даём остаться без директора
  if (!list.some((u) => u.role === 'director')) return res.status(400).json({ error: 'Нужен хотя бы один руководитель' })
  const current = await getUsers()
  const byId = new Map(current.map((u) => [u.id, u]))
  // Новый пароль (если указан в форме) хэшируем; иначе сохраняем прежний хэш.
  const next = list.map(({ password, ...u }) => ({
    ...u,
    passwordHash: password ? bcrypt.hashSync(password, 10) : byId.get(u.id)?.passwordHash,
  }))
  res.json(await setUsers(next))
})

// ===== Стажёры (чтение — по скоупу, запись — director/manager) =====
app.get('/api/trainees', async (req, res) => {
  const all = await getTrainees()
  const logins = await allowedLogins(req.user)
  res.json(logins === null ? all : all.filter((t) => logins.includes(t.login)))
})
app.put('/api/trainees', async (req, res) => {
  if (!can.editTrainees(req.user)) return res.status(403).json({ error: 'Недостаточно прав' })
  const list = Array.isArray(req.body) ? req.body : req.body?.trainees
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Ожидается массив стажёров' })
  if (can.manageAll(req.user)) return res.json(await setTrainees(list))
  // менеджер: применяем изменения только к своим стажёрам, остальных сохраняем как есть
  const logins = await allowedLogins(req.user)
  const allowed = new Set(logins)
  const current = await getTrainees()
  const incoming = new Map(list.filter((t) => allowed.has(t.login)).map((t) => [t.id, t]))
  const merged = current.map((t) => (incoming.has(t.id) ? incoming.get(t.id) : t))
  res.json(await setTrainees(merged))
})

app.get('/api/meta', async (_req, res) => res.json(await getMeta()))
app.put('/api/meta', requireDirector, async (req, res) => res.json(await setMeta(req.body || {})))

app.get('/api/settings', async (_req, res) => res.json(await getSettings()))
app.put('/api/settings', requireDirector, async (req, res) => {
  const s = await setSettings(req.body || {})
  await reschedule()
  res.json(s)
})

// ===== Дашборды Grafana (доп. виджеты; настраивает руководитель, видят все) =====
app.get('/api/boards', async (_req, res) => res.json(await getBoards()))
app.put('/api/boards', requireDirector, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.boards
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Ожидается массив бордов' })
  res.json(await setBoards(list))
})
// Данные борда за период — по скоупу пользователя (директор = без фильтра по логину).
app.get('/api/boards/:id/data', async (req, res) => {
  const board = (await getBoards()).find((b) => b.id === req.params.id)
  if (!board) return res.status(404).json({ error: 'Борд не найден' })
  const from = Number(req.query.from)
  const to = Number(req.query.to)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return res.status(400).json({ error: 'Нужны параметры from/to (мс)' })
  try {
    const logins = await allowedLogins(req.user)
    const result = await collectDashboard(board.uid, logins === null ? [] : logins, from, to, board.queueVar)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
})

// ===== Недели (чтение по скоупу) =====
app.get('/api/weeks', async (req, res) => {
  const weeks = await getWeeks()
  const logins = await allowedLogins(req.user)
  if (logins === null) return res.json(weeks)
  const out = {}
  for (const [k, w] of Object.entries(weeks)) out[k] = scopeWeek(w, logins)
  res.json(out)
})
app.get('/api/week/:key', async (req, res) => {
  const w = await getWeek(req.params.key)
  if (!w) return res.json({ empty: true })
  const logins = await allowedLogins(req.user)
  res.json(scopeWeek(w, logins))
})
app.delete('/api/week/:key', requireDirector, async (req, res) => res.json(await deleteWeek(req.params.key)))

// Сбор недели по запросу — director/manager.
app.post('/api/collect-week', async (req, res) => {
  if (!can.editTrainees(req.user)) return res.status(403).json({ error: 'Недостаточно прав' })
  try {
    const monday = mondayIsoOf(parseIso(req.body?.weekStart || localIso(new Date())))
    const s = await getSettings()
    const week = await collectWeek(monday, { startHour: s.startHour, endHour: s.final.endHour }, true)
    const logins = await allowedLogins(req.user)
    res.json(scopeWeek(week, logins))
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
})

// Ручное поле строки недели — director/manager (в пределах своего скоупа).
app.patch('/api/week/:key/:login', async (req, res) => {
  if (!can.editTrainees(req.user)) return res.status(403).json({ error: 'Недостаточно прав' })
  const logins = await allowedLogins(req.user)
  if (logins !== null && !logins.includes(req.params.login)) return res.status(403).json({ error: 'Нет доступа к этому стажёру' })
  const allowed = ['quality', 'discipline', 'comment', 'speedOverride']
  const patch = {}
  for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k]
  res.json(await patchWeekRow(req.params.key, req.params.login, patch))
})

// ===== Авто-сбор по настройкам (два запуска: предварительный и финальный) =====
const TZ = process.env.TZ || 'Europe/Moscow'
let tasks = []
async function reschedule() {
  tasks.forEach((t) => t.stop())
  tasks = []
  const s = await getSettings()
  if (!s.enabled) {
    console.log('[cron] авто-сбор выключен в настройках')
    return
  }
  const mk = (job, label) => {
    const expr = `${job.min} ${job.hour} * * ${job.dow}`
    if (!cron.validate(expr)) return console.warn(`[cron] плохое расписание ${label}: "${expr}"`)
    const task = cron.schedule(
      expr,
      async () => {
        try {
          const monday = mondayIsoOf(new Date())
          const w = await collectWeek(monday, { startHour: s.startHour, endHour: job.endHour }, true)
          console.log(`[cron] ${label}: неделя ${monday} (Пн ${s.startHour}:00 → ${job.endHour}:00), стажёров ${Object.keys(w.rows).length}`)
        } catch (e) {
          console.error(`[cron] ошибка (${label}):`, e.message || e)
        }
      },
      { timezone: TZ },
    )
    tasks.push(task)
    console.log(`[cron] ${label}: "${expr}" (${TZ}), период Пн ${s.startHour}:00 → Пт ${job.endHour}:00`)
  }
  mk(s.prelim, 'предварительный')
  mk(s.final, 'финальный')
}

// ===== Статика фронтенда =====
const DIST = join(__dirname, '..', 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(DIST, 'index.html')))
  console.log('Статика фронтенда раздаётся из dist/')
} else {
  console.log('dist/ не найден — для прод-режима запусти "npm run build" в корне.')
}

app.listen(PORT, () => {
  console.log(`Прокси к Grafana запущен на http://localhost:${PORT}`)
  if (!process.env.GRAFANA_TOKEN) console.warn('⚠️  GRAFANA_TOKEN не задан — заполни server/.env')
  reschedule()
})
