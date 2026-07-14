// Файловое хранилище: стажёры и понедельные снапшоты статистики.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const TRAINEES_FILE = join(DATA_DIR, 'trainees.json')
const WEEKS_FILE = join(DATA_DIR, 'weeks.json')
const META_FILE = join(DATA_DIR, 'meta.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')
const USERS_FILE = join(DATA_DIR, 'users.json')
const BOARDS_FILE = join(DATA_DIR, 'boards.json')
const GRAFANA_FILE = join(DATA_DIR, 'grafana.json')
const OAUTH_FILE = join(DATA_DIR, 'oauth.json')

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true })
}
async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf-8'))
  } catch {
    return fallback
  }
}
async function writeJson(file, data) {
  await ensureDir()
  await writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
  return data
}

// ===== Пользователи (роли) =====
// { id, username, passwordHash, role: 'director'|'manager'|'trainee', name, mentor?, login? }
export async function getUsers() {
  let users = await readJson(USERS_FILE, null)
  if (!Array.isArray(users) || !users.length) {
    users = [{ id: 'u1', username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), role: 'director', name: 'Руководитель' }]
    await writeJson(USERS_FILE, users)
  }
  return users
}
export const setUsers = (list) => writeJson(USERS_FILE, Array.isArray(list) ? list : [])

// ===== Стажёры =====
// { id, name, login, group, mentor, lead, startDate, closedIS, fired, comment }
export const getTrainees = () => readJson(TRAINEES_FILE, [])
export const setTrainees = (list) => writeJson(TRAINEES_FILE, Array.isArray(list) ? list : [])

// Активные = не закрыт ИС и не уволен.
export async function getActiveTrainees() {
  return (await getTrainees()).filter((t) => !t.closedIS && !t.fired && t.login)
}

// ===== Справочники: наставники и лиды =====
// meta = { mentors: string[], leads: string[] }
export async function getMeta() {
  const m = await readJson(META_FILE, null)
  if (m && Array.isArray(m.mentors) && Array.isArray(m.leads)) return m
  // Первичное заполнение из существующих стажёров.
  const trainees = await getTrainees()
  const uniq = (arr) => [...new Set(arr.map((s) => (s || '').trim()).filter(Boolean))].sort()
  const seeded = {
    mentors: uniq(trainees.map((t) => t.mentor)),
    leads: uniq(trainees.map((t) => t.lead)),
  }
  await writeJson(META_FILE, seeded)
  return seeded
}
export async function setMeta(meta) {
  const clean = {
    mentors: Array.isArray(meta?.mentors) ? meta.mentors.map((s) => String(s).trim()).filter(Boolean) : [],
    leads: Array.isArray(meta?.leads) ? meta.leads.map((s) => String(s).trim()).filter(Boolean) : [],
  }
  return writeJson(META_FILE, clean)
}

// ===== Настройки авто-сбора =====
// settings = { enabled, startHour, prelim:{dow,hour,min,endHour}, final:{dow,hour,min,endHour} }
export const DEFAULT_SETTINGS = {
  enabled: true,
  startHour: 9, // понедельник, час начала рабочей недели
  prelim: { dow: 5, hour: 9, min: 0, endHour: 9 }, // пятница 09:00 → период до пятницы 09:00
  final: { dow: 5, hour: 19, min: 0, endHour: 18 }, // пятница 19:00 → период до пятницы 18:00
}
export async function getSettings() {
  const s = await readJson(SETTINGS_FILE, null)
  if (!s) return DEFAULT_SETTINGS
  return {
    enabled: s.enabled !== false,
    startHour: Number.isFinite(s.startHour) ? s.startHour : 9,
    prelim: { ...DEFAULT_SETTINGS.prelim, ...(s.prelim || {}) },
    final: { ...DEFAULT_SETTINGS.final, ...(s.final || {}) },
  }
}
export async function setSettings(s) {
  const cur = await getSettings()
  const next = {
    enabled: s?.enabled !== undefined ? s.enabled !== false : cur.enabled,
    startHour: Number.isFinite(s?.startHour) ? s.startHour : cur.startHour,
    prelim: { ...cur.prelim, ...(s?.prelim || {}) },
    final: { ...cur.final, ...(s?.final || {}) },
  }
  return writeJson(SETTINGS_FILE, next)
}

// ===== Дашборды Grafana (доп. виджеты, настраиваются в «Настройках») =====
// { id, uid, name, queueVar? }
export const getBoards = () => readJson(BOARDS_FILE, [])
export const setBoards = (list) => writeJson(BOARDS_FILE, Array.isArray(list) ? list : [])

// ===== Подключение к Grafana (URL + токен), настраивается в «Настройках» =====
// Приоритет над server/.env, если задано через UI. { url?, token? }
export const getGrafanaConfig = () => readJson(GRAFANA_FILE, {})
export async function setGrafanaConfig({ url, token }) {
  const cur = await getGrafanaConfig()
  const next = {
    url: url !== undefined ? String(url).trim() : cur.url || '',
    // Пустая строка токена в PATCH-запросе = «не менять» (чтобы не затирать сохранённый токен при простом обновлении URL).
    token: token ? String(token).trim() : cur.token || '',
  }
  return writeJson(GRAFANA_FILE, next)
}

// ===== Вход через Telegram/Google (бот-юзернейм+токен, Client ID), «Настройки» =====
// { telegramBotUsername?, telegramBotToken?, googleClientId? }
export const getOAuthConfig = () => readJson(OAUTH_FILE, {})
export async function setOAuthConfig({ telegramBotUsername, telegramBotToken, googleClientId }) {
  const cur = await getOAuthConfig()
  const next = {
    telegramBotUsername: telegramBotUsername !== undefined ? String(telegramBotUsername).trim() : cur.telegramBotUsername || '',
    // Пустой токен в запросе = «не менять» (не затираем сохранённый токен бота при правке остальных полей).
    telegramBotToken: telegramBotToken ? String(telegramBotToken).trim() : cur.telegramBotToken || '',
    googleClientId: googleClientId !== undefined ? String(googleClientId).trim() : cur.googleClientId || '',
  }
  return writeJson(OAUTH_FILE, next)
}

// ===== Понедельные снапшоты =====
// weeks = { [mondayISO]: { from, to, collectedAt, rows: { [login]: {...} } } }
export const getWeeks = () => readJson(WEEKS_FILE, {})

export async function getWeek(weekKey) {
  return (await getWeeks())[weekKey] || null
}

// Сохранить снапшот недели, сохраняя ручные поля (quality, discipline, comment, speedOverride).
const MANUAL_FIELDS = ['quality', 'discipline', 'comment', 'speedOverride']
export async function saveWeek(weekKey, week) {
  const weeks = await getWeeks()
  const prev = weeks[weekKey]?.rows || {}
  const rows = { ...week.rows }
  for (const login of Object.keys(rows)) {
    for (const f of MANUAL_FIELDS) {
      if (prev[login] && prev[login][f] !== undefined && rows[login][f] === undefined) {
        rows[login][f] = prev[login][f]
      }
    }
  }
  weeks[weekKey] = { ...week, rows }
  await writeJson(WEEKS_FILE, weeks)
  return weeks[weekKey]
}

// Удалить снапшот недели целиком.
export async function deleteWeek(weekKey) {
  const weeks = await getWeeks()
  if (weeks[weekKey]) {
    delete weeks[weekKey]
    await writeJson(WEEKS_FILE, weeks)
  }
  return { ok: true }
}

// Точечно обновить ручные поля строки недели.
export async function patchWeekRow(weekKey, login, patch) {
  const weeks = await getWeeks()
  if (!weeks[weekKey]) weeks[weekKey] = { rows: {} }
  if (!weeks[weekKey].rows[login]) weeks[weekKey].rows[login] = {}
  Object.assign(weeks[weekKey].rows[login], patch)
  await writeJson(WEEKS_FILE, weeks)
  return weeks[weekKey].rows[login]
}
