// Клиент к бэкенд-прокси. По умолчанию same-origin (/api):
// в dev запросы проксируются Vite на localhost:8787, в проде — обслуживаются тем же сервером.
import type { Trainee, WeekData } from './data/norms'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || ''
const TOKEN_KEY = 'auth-token'

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Колбэк, вызываемый при 401 (разлогинить в UI).
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.get()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  })
  if (res.status === 401) {
    auth.clear()
    onUnauthorized?.()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`)
  return data as T
}

export type Role = 'director' | 'manager' | 'trainee'
export interface User {
  id: string
  username: string
  role: Role
  name: string
  mentor: string | null
  login: string | null
}
export interface UserRecord {
  id: string
  username: string
  password?: string
  role: Role
  name: string
  mentor?: string
  login?: string
}

export interface ManualPatch {
  quality?: number
  discipline?: number
  comment?: string
  speedOverride?: number
}

export interface Meta {
  mentors: string[]
  leads: string[]
}

export interface CronJob {
  dow: number
  hour: number
  min: number
  endHour: number
}
export interface Settings {
  enabled: boolean
  startHour: number
  prelim: CronJob
  final: CronJob
}

export const api = {
  // auth
  login: (username: string, password: string) =>
    req<{ token: string; user: User }>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => req<User>('/api/me'),
  logout: () => req<{ ok: boolean }>('/api/logout', { method: 'POST' }),
  // users (director)
  getUsers: () => req<UserRecord[]>('/api/users'),
  setUsers: (list: UserRecord[]) => req<UserRecord[]>('/api/users', { method: 'PUT', body: JSON.stringify(list) }),
  // data
  health: () => req<{ ok: boolean; status: number; version?: string }>('/api/health'),
  getTrainees: () => req<Trainee[]>('/api/trainees'),
  setTrainees: (list: Trainee[]) =>
    req<Trainee[]>('/api/trainees', { method: 'PUT', body: JSON.stringify(list) }),
  getMeta: () => req<Meta>('/api/meta'),
  setMeta: (meta: Meta) => req<Meta>('/api/meta', { method: 'PUT', body: JSON.stringify(meta) }),
  getSettings: () => req<Settings>('/api/settings'),
  setSettings: (s: Settings) => req<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(s) }),
  weeks: () => req<Record<string, WeekData>>('/api/weeks'),
  deleteWeek: (key: string) => req<{ ok: boolean }>(`/api/week/${key}`, { method: 'DELETE' }),
  week: (key: string) => req<WeekData>(`/api/week/${key}`),
  collectWeek: (weekStart: string) =>
    req<WeekData>('/api/collect-week', { method: 'POST', body: JSON.stringify({ weekStart }) }),
  patchRow: (key: string, login: string, patch: ManualPatch) =>
    req<unknown>(`/api/week/${key}/${encodeURIComponent(login)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}
