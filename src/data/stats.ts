// Данные для раздела «Статистика».
// Демо-данные: реальные дашборды Grafana заменены заглушками.

export interface GrafanaDashboard {
 key: string
 title: string
 description: string
 uid: string
 slug: string
 // имя переменной-фильтра в дашборде (queue = логин сотрудника в рабочей панели)
 queueVar: string
}

export const GRAFANA_BASE = 'https://grafana.example.com'

export const GRAFANA_DASHBOARDS: GrafanaDashboard[] = [
 {
 key: 'vygruzka',
 title: 'Выгрузка тикетов (Support metrics)',
 description: 'Тикеты, ответы и скорость сотрудника за период. Основной дашборд для недельной статистики.',
 uid: 'demo-dashboard-uid-1',
 slug: 'ticket-export-support-metrics',
 queueVar: 'queue',
 },
 {
 key: 'otp-tickets',
 title: 'История тикетов',
 description: 'История тикетов сотрудника — детальный просмотр обращений за период.',
 uid: 'demo-dashboard-uid-2',
 slug: 'ticket-history',
 queueVar: 'queue',
 },
]

// Шкала дисциплины (опоздания за неделю/месяц). Источник: форма ввода статистики.
export interface DisciplineLevel {
 range: string
 status: string
 emoji: string
 tone: 'good' | 'warn' | 'orange' | 'bad'
}

export const DISCIPLINE_SCALE: DisciplineLevel[] = [
 { range: '0', status: 'Идеально', emoji: '', tone: 'good' },
 { range: '1–2', status: 'Редкие опоздания', emoji: '', tone: 'warn' },
 { range: '3–5', status: 'Систематически', emoji: '', tone: 'orange' },
 { range: '> 5', status: 'Критично (сумма за месяц)', emoji: '', tone: 'bad' },
]

// Календарь учётных периодов 2026 (из скрипта StataMonth.gs). Формат: начало → конец.
export interface MonthPeriod {
 month: string
 start: string
 end: string
}

export const CALENDAR_2026: MonthPeriod[] = [
 { month: 'Январь', start: '12.01.2026', end: '30.01.2026' },
 { month: 'Февраль', start: '02.02.2026', end: '27.02.2026' },
 { month: 'Март', start: '02.03.2026', end: '03.04.2026' },
 { month: 'Апрель', start: '06.04.2026', end: '01.05.2026' },
 { month: 'Май', start: '04.05.2026', end: '29.05.2026' },
 { month: 'Июнь', start: '01.06.2026', end: '03.07.2026' },
 { month: 'Июль', start: '06.07.2026', end: '31.07.2026' },
 { month: 'Август', start: '03.08.2026', end: '28.08.2026' },
 { month: 'Сентябрь', start: '07.09.2026', end: '02.10.2026' },
 { month: 'Октябрь', start: '05.10.2026', end: '30.10.2026' },
 { month: 'Ноябрь', start: '02.11.2026', end: '04.12.2026' },
 { month: 'Декабрь', start: '07.12.2026', end: '30.12.2026' },
]

// Файлы Apps Script таблицы «Обучение» — для справочного раздела.
export interface ScriptFile {
 file: string
 menu: string
 role: string
 desc: string
}

export const SCRIPT_FILES: ScriptFile[] = [
 {
 file: 'Code.gs',
 menu: 'Меню',
 role: 'Ядро системы и меню',
 desc: 'Создаёт пользовательское меню при открытии таблицы, открывает формы и обрабатывает данные еженедельной статистики.',
 },
 {
 file: 'Form.html',
 menu: 'Заполнить статистику',
 role: 'Форма ввода недельных KPI',
 desc: 'Ввод метрик стажёра (скорость, качество, тикеты) за неделю. Автозаполнение нулями, если стажёр ещё не на тикетах.',
 },
 {
 file: 'Архивация.gs',
 menu: 'Скрыть / Показать всех',
 role: 'Управление видимостью строк',
 desc: 'Скрывает строки выбранных стажёров на листе статистики, чтобы они не мешали текущей работе.',
 },
 {
 file: 'HideForm.html',
 menu: '—',
 role: 'Окно выбора для скрытия',
 desc: 'Всплывающее окно со списком имён для скрытия конкретного стажёра из статистики.',
 },
 {
 file: 'CuratorTools.gs',
 menu: 'Добавить стажёра',
 role: 'Инструменты кураторства',
 desc: 'Зачисление новых стажёров, автоматический расчёт дат проверок и управление видимостью на листе «Стажёры-кураторы».',
 },
 {
 file: 'CuratorForm.html',
 menu: 'Добавить стажёра (Кураторство)',
 role: 'Форма зачисления',
 desc: 'Указание ФИО, ссылки на Telegram, группы, наставника и лида с автоматической фиксацией даты выхода.',
 },
 {
 file: 'HideFormCurator.html',
 menu: '—',
 role: 'Массовое скрытие',
 desc: 'Форма с чекбоксами для быстрого скрытия сразу нескольких закончивших этап стажёров.',
 },
 {
 file: 'StataMonth.gs',
 menu: 'Сформировать отчёт по месяцам',
 role: 'Генератор месячной аналитики',
 desc: 'Агрегирует недельные записи в одну строку на стажёра за месяц: средняя скорость, % качества, суммы KPI.',
 },
 {
 file: 'MonthSelect.html',
 menu: '—',
 role: 'Окно параметров отчёта',
 desc: 'Выбор месяца и конкретных стажёров (чекбоксы) для формирования итоговой статистики за месяц.',
 },
]

// Что делает меню таблицы — список действий.
export const MENU_ACTIONS: { label: string; fn: string; note: string }[] = [
 { label: 'Добавить стажёра (Кураторство)', fn: 'showCuratorForm', note: 'Анкета нового стажёра; списки наставников и лидов собираются автоматически.' },
 { label: 'Скрыть из кураторства', fn: 'hideCuratorTrainee', note: 'Проверяет столбец «Закрыт ИС»/«Уволился» и скрывает строку на трёх листах.' },
 { label: 'Показать всех в кураторстве', fn: 'unhideAllCurator', note: 'Раскрывает скрытые строки.' },
 { label: 'Заполнить статистику', fn: 'showForm', note: '«Умная» форма ввода недельных показателей одного стажёра.' },
 { label: 'Сформировать отчёт по месяцам', fn: 'showMonthSelect', note: 'Сборка итогов за выбранные месяцы на листе «Статистика по месяцам».' },
 { label: 'Скрыть из статистики', fn: 'hideTrainee', note: 'Скрытие стажёра на листе «Статистика NEW».' },
 { label: 'Показать всех в статистике', fn: 'unhideAll', note: 'Раскрывает скрытые строки статистики.' },
]

// ===== Типы ответа бэкенд-прокси (server/grafana.js) =====
export interface PanelFrame {
 refId: string
 columns: string[]
 rows: (string | number | null)[][]
}
export interface PanelResult {
 title: string
 type: string
 frames?: PanelFrame[]
 error?: string
 skipped?: string
}
export interface LoginResult {
 login: string | null
 panels: PanelResult[]
}
export interface DashboardResult {
 uid: string
 title: string
 perLogin: LoginResult[]
}
export interface Snapshot {
 collectedAt: string
 from: number
 to: number
 logins: string[]
 dashboards: DashboardResult[]
 errors: { uid: string; error: string }[]
 empty?: boolean
}
