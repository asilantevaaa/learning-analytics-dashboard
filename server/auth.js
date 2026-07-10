// Аутентификация и роли. Простые токены-сессии в памяти (сбрасываются при рестарте).
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getUsers, getTrainees } from './store.js'

const sessions = new Map() // token -> userId

export async function login(username, password) {
  const users = await getUsers()
  const u = users.find((x) => x.username === username)
  if (!u || !u.passwordHash || !bcrypt.compareSync(password, u.passwordHash)) return null
  const token = randomBytes(24).toString('hex')
  sessions.set(token, u.id)
  return { token, user: publicUser(u) }
}

export function logout(token) {
  sessions.delete(token)
}

function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, name: u.name || u.username, mentor: u.mentor || null, login: u.login || null }
}

// Достать пользователя по токену из заголовка Authorization: Bearer <token>.
export async function userFromReq(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  const userId = sessions.get(token)
  if (!userId) return null
  const users = await getUsers()
  const u = users.find((x) => x.id === userId)
  return u ? u : null
}

// Логины стажёров, доступные пользователю. null = все (директор).
export async function allowedLogins(user) {
  if (!user) return []
  if (user.role === 'director') return null
  if (user.role === 'trainee') return user.login ? [user.login] : []
  if (user.role === 'manager') {
    const trainees = await getTrainees()
    return trainees.filter((t) => t.mentor && t.mentor === user.mentor).map((t) => t.login)
  }
  return []
}

export const can = {
  // Полный доступ на запись (стажёры, настройки, сбор, пользователи) — только директор.
  manageAll: (u) => u?.role === 'director',
  // Менеджер и директор могут редактировать своих стажёров и недельные данные.
  editTrainees: (u) => u?.role === 'director' || u?.role === 'manager',
}
