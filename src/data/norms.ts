// Нормы и цветовые критерии недельной статистики стажёров.
// Источник: условное форматирование листа «Статистика NEW» в таблице «Обучение».

export type Group = 'Л1' | 'SSL' | 'Домены' | string
export type Tone = 'good' | 'neutral' | 'warn' | 'orange' | 'bad' | ''

// Нормы скорости по неделе обучения (индекс = номер недели, 1-based, потолок 14).
const SPEED_NORM_L1 = [0, 1.5, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5]
const SPEED_NORM_SSL_DOM = [0, 1.5, 2, 3, 3, 4, 4.5, 5, 6, 7, 7.5, 8, 8, 8]
// Норма качества (staff %) по неделе обучения.
const QUALITY_NORM = [0, 45, 50, 60, 60, 65, 70, 75, 80, 80, 85, 85, 85, 85]

const at = (arr: number[], week: number | null | undefined): number | null => {
  if (!week || week < 1) return null
  return arr[Math.min(week, arr.length) - 1]
}

export const speedNorm = (week: number | null, group: Group): number | null =>
  at(group === 'Л1' ? SPEED_NORM_L1 : SPEED_NORM_SSL_DOM, week)
export const qualityNorm = (week: number | null): number | null => at(QUALITY_NORM, week)

// Цвет относительно нормы: ниже — плохо, равно — нейтрально, выше — хорошо.
function vsNorm(value: number | null | undefined, norm: number | null): Tone {
  if (value == null || norm == null) return ''
  if (value < norm) return 'bad'
  if (value === norm) return 'neutral'
  return 'good'
}

export const speedTone = (value: number | null, week: number | null, group: Group): Tone =>
  vsNorm(value, speedNorm(week, group))
export const qualityTone = (value: number | null, week: number | null): Tone =>
  vsNorm(value, qualityNorm(week))

// Передачи % и Отложка %: ≤30 🟢, 30–40 🟡, >40 🔴.
export function pctTone(value: number | null | undefined): Tone {
  if (value == null) return ''
  if (value <= 30) return 'good'
  if (value <= 40) return 'warn'
  return 'bad'
}

// Дисциплина (баллы опозданий): 0 ✅, 1–2 ⚠️, 3–5 🟠, >5 🔴.
export function disciplineTone(points: number | null | undefined): Tone {
  if (points == null) return ''
  if (points === 0) return 'good'
  if (points <= 2) return 'warn'
  if (points <= 5) return 'orange'
  return 'bad'
}
export function disciplineStatus(points: number | null | undefined): string {
  if (points == null) return '—'
  if (points === 0) return 'Идеально'
  if (points <= 2) return 'Редкие'
  if (points <= 5) return 'Систематически'
  return 'Критично'
}

// ===== Типы данных =====
export interface Trainee {
  id: string
  name: string
  login: string
  group: Group
  mentor?: string
  lead?: string
  startDate?: string // YYYY-MM-DD, реальная дата выхода
  closedIS?: string | null // дата закрытия ИС → скрыт
  fired?: string | null // дата увольнения → скрыт
  comment?: string
  stages?: string[] // выполненные этапы онбординга (ключи из STAGES)
  stageDates?: Record<string, string> // даты этапов: { tickets: 'YYYY-MM-DD', ... }
}

// Этапы онбординга (чек-лист). Порядок = прогресс. Источник: план работы со стажёром L1.
export interface Stage {
  key: string
  label: string
  hint: string
}
export const STAGES: Stage[] = [
  { key: 'course', label: 'Курс VH-стажёр / КС', hint: 'Изучение вводного курса (недели 1–2)' },
  { key: 'tickets', label: 'Вышел на тикеты', hint: 'Работа в тикетах на проверке (~день 7)' },
  { key: 'cowboy', label: 'Обучение VH-ковбой', hint: 'Расширение тематик (недели 3+)' },
  { key: 'chats', label: 'Вышел в чаты', hint: 'Качество в Staff от 60% (~день 21)' },
  { key: 'phones', label: 'Вышел в телефоны', hint: 'Деловая игра и звонки (~день 26)' },
  { key: 'closed', label: 'Закрыл ИС', hint: 'Прошёл испытательный срок' },
]

// Текущий этап = последний выполненный по порядку STAGES.
export function currentStage(stages: string[] | undefined): Stage | null {
  if (!stages?.length) return null
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (stages.includes(STAGES[i].key)) return STAGES[i]
  }
  return null
}

// Сколько дней стажёр с нами (с даты выхода до сегодня).
export function daysWithUs(startDate?: string): number | null {
  if (!startDate) return null
  const start = new Date(startDate + 'T00:00:00').getTime()
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((now.getTime() - start) / 86400000))
}

export interface WeekRow {
  name: string
  group: Group
  mentor: string
  weekNum: number | null
  esche: number
  otvety: number
  peredachi: number
  otlozhka: number
  peredachiPct: number
  otlozhkaPct: number
  weightedHours: number
  speed: number
  qualityAuto?: number | null // % без ошибок (проверки стажёра, авто)
  qualityChecks?: number
  // ручные поля
  quality?: number
  discipline?: number
  comment?: string
  speedOverride?: number
}

export interface WeekData {
  from: number
  to: number
  collectedAt: string
  rows: Record<string, WeekRow>
  empty?: boolean
}

// Дата выхода с ИС = дата выхода + 3 месяца.
export function endISDate(startDate?: string): string | null {
  if (!startDate) return null
  const d = new Date(startDate + 'T00:00:00')
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
}

export const isActive = (t: Trainee): boolean => !t.closedIS && !t.fired
