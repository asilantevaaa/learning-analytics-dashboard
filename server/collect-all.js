// Разовый скрипт: собрать статистику по всем неделям обучения всех стажёров.
// Запуск: node collect-all.js   (нужен VPN + GRAFANA_TOKEN в .env)
import 'dotenv/config'
import { getTrainees, saveWeek } from './store.js'
import { collectTickets, collectSpeed, collectQuality, computeSpeed } from './metrics.js'

const DAY = 86400000
const localIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function mondayOf(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
function weekRange(mondayIso, startHour = 9, endHour = 18) {
  const mon = mondayOf(parseIso(mondayIso))
  const from = new Date(mon); from.setHours(startHour, 0, 0, 0)
  const fri = new Date(mon.getTime() + 4 * DAY); fri.setHours(endHour, 0, 0, 0)
  return { from: from.getTime(), to: fri.getTime() }
}
function traineeWeekNum(startDate, weekMondayMs) {
  if (!startDate) return null
  return Math.round((weekMondayMs - mondayOf(parseIso(startDate)).getTime()) / (7 * DAY)) + 1
}
function traineesInWeek(all, mondayIso) {
  const fridayIso = localIso(new Date(mondayOf(parseIso(mondayIso)).getTime() + 4 * DAY))
  return all.filter((t) => {
    if (!t.login || !t.startDate) return false
    if (t.startDate > fridayIso) return false
    if (t.fired && t.fired < mondayIso) return false
    if (t.closedIS && t.closedIS < mondayIso) return false
    return true
  })
}

const all = await getTrainees()
const starts = all.map((t) => t.startDate).filter(Boolean).sort()
let cursor = mondayOf(parseIso(starts[0]))
const lastMonday = mondayOf(new Date())
let collected = 0

while (cursor.getTime() <= lastMonday.getTime()) {
  const mondayIso = localIso(cursor)
  const trainees = traineesInWeek(all, mondayIso)
  if (trainees.length) {
    const { from, to } = weekRange(mondayIso, 9, 18)
    const logins = trainees.map((t) => t.login)
    try {
      const [tickets, speeds, quality] = await Promise.all([
        collectTickets(logins, from, to),
        collectSpeed(logins, from, to),
        collectQuality(logins, from, to),
      ])
      const rows = {}
      for (const t of trainees) {
        const tk = tickets[t.login] || {}, sp = speeds[t.login] || {}, q = quality[t.login] || {}
        rows[t.login] = {
          name: t.name, group: t.group || '', mentor: t.mentor || '',
          weekNum: traineeWeekNum(t.startDate, from),
          esche: tk.esche || 0, otvety: tk.otvety || 0, peredachi: tk.peredachi || 0, otlozhka: tk.otlozhka || 0,
          peredachiPct: tk.peredachiPct || 0, otlozhkaPct: tk.otlozhkaPct || 0,
          weightedHours: Math.round(((sp.weightedSec || 0) / 3600) * 10) / 10,
          speed: computeSpeed(tk.esche || 0, sp),
          qualityAuto: q.qualityAuto ?? null, qualityChecks: q.qualityChecks || 0,
        }
      }
      await saveWeek(mondayIso, { from, to, collectedAt: new Date().toISOString(), rows })
      collected++
      const withData = Object.values(rows).filter((r) => r.esche || r.otvety || r.qualityChecks).length
      console.log(`✓ ${mondayIso}: стажёров ${trainees.length}, с данными ${withData}`)
    } catch (e) {
      console.error(`✗ ${mondayIso}: ${e.message}`)
    }
  }
  cursor = new Date(cursor.getTime() + 7 * DAY)
}
console.log(`\nГотово. Недель собрано: ${collected}`)
