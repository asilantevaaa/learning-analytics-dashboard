// Критерии выхода с испытательного срока. Источник: лист «Критерии выхода с ИС».

export interface CriteriaRow {
  track: string
  chats: string
  tickets: string
  quality: string
}

export const CRITERIA: CriteriaRow[] = [
  { track: 'Скорость для первой линии', chats: '> 5 (в идеале 7)', tickets: '> 5 (если 7 — выход с ИС раньше)', quality: '≥ 90%' },
  { track: 'Скорость для второй линии', chats: '3.0', tickets: '8.0', quality: '90%' },
]

export const CRITERIA_NOTE =
  'Важно выполнять качество + один из показателей скорости + наличие экстра-тикетов. ' +
  'На первой линии скорость в тикетах должна быть не ниже 5. Если ниже — остальные показатели не учитываются, ИС не пройден.'
