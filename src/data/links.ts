// Каталог полезных ссылок для онбординга.
// Демо-данные: реальные внутренние документы/чаты заменены ссылками-заглушками.

export interface LinkItem {
  key: string
  title: string
  href: string
  note?: string
}

import type { IconName } from '../components/Icon'

export interface LinkGroup {
  title: string
  icon: IconName
  items: LinkItem[]
}

export const LINK_GROUPS: LinkGroup[] = [
  {
    title: 'Таблицы (Google Sheets)',
    icon: 'table',
    items: [
      {
        key: 'tbl-obuchenie',
        title: 'Обучение (основная таблица)',
        href: 'https://docs.google.com/spreadsheets/d/example-main/edit',
        note: 'Стажёры-кураторы, статистика, критерии — всё здесь',
      },
      {
        key: 'tbl-stazery-kuratory',
        title: 'Стажёры-кураторы',
        href: 'https://docs.google.com/spreadsheets/d/example-trainees/edit',
        note: 'Информация о стажёре, наставник, лид, этап обучения',
      },
      {
        key: 'tbl-statistika',
        title: 'Статистика',
        href: 'https://docs.google.com/spreadsheets/d/example-statistics/edit',
        note: 'Статистика стажёров за неделю по периодам',
      },
      {
        key: 'tbl-raspisanie',
        title: 'Расписание сотрудников',
        href: 'https://docs.google.com/spreadsheets/d/example-schedule/edit',
      },
      {
        key: 'tbl-balansirovki',
        title: 'Балансировки нагрузки',
        href: 'https://docs.google.com/spreadsheets/d/example-load-balancing/edit',
        note: 'Добавляет лид',
      },
      {
        key: 'tbl-dni-rozhdeniya',
        title: 'Дни рождения',
        href: 'https://docs.google.com/spreadsheets/d/example-birthdays/edit',
      },
      {
        key: 'tbl-uchet-kk',
        title: 'Учёт сотрудников для КК',
        href: 'https://docs.google.com/spreadsheets/d/example-qc-tracking/edit',
      },
      {
        key: 'tbl-bonus',
        title: 'Бонус для сотрудников',
        href: 'https://docs.google.com/spreadsheets/d/example-bonus/edit',
      },
    ],
  },
  {
    title: 'Деловая игра и звонки (телефоны)',
    icon: 'phone',
    items: [
      {
        key: 'doc-igra-menedzhery',
        title: 'Деловая игра «Телефоны» — для менеджеров',
        href: 'https://docs.google.com/document/d/example-role-play-managers/edit',
      },
      {
        key: 'doc-igra-stazhery',
        title: 'Деловая игра «Телефоны» — для стажёров',
        href: 'https://docs.google.com/document/d/example-role-play-trainees/edit',
      },
      {
        key: 'doc-zvonki-otrabotka',
        title: 'Шаблон: звонки на отработку',
        href: 'https://docs.google.com/document/d/example-call-practice/edit',
      },
      {
        key: 'doc-negativ',
        title: 'Работа с негативом + методы завершения звонка',
        href: 'https://drive.google.com/file/d/example-handling-negativity/view',
      },
      {
        key: 'folder-zvonki',
        title: 'Папка с примерами звонков',
        href: 'https://drive.google.com/drive/folders/example-calls',
      },
    ],
  },
  {
    title: 'Доступы и макеты',
    icon: 'key',
    items: [
      {
        key: 'doc-makety',
        title: 'Макеты для обучения (карта клиента, почта, панель, DNS, тарифы)',
        href: 'https://drive.google.com/drive/folders/example-mockups',
      },
      { key: 'password-manager', title: 'Менеджер паролей (доступы)', href: 'https://vault.example.com/login' },
    ],
  },
  {
    title: 'Сервисы',
    icon: 'tools',
    items: [
      { key: 'teachbase', title: 'Teachbase (обучение)', href: 'https://go.teachbase.ru/login' },
      {
        key: 'grafana-vygruzka',
        title: 'Grafana — выгрузка тикетов',
        href: 'https://grafana.example.com/d/demo-dashboard-uid-1/ticket-export?orgId=1',
      },
      {
        key: 'grafana-istoriya',
        title: 'Grafana — история тикетов',
        href: 'https://grafana.example.com/d/demo-dashboard-uid-2/ticket-history?orgId=1',
      },
      { key: 'calendar', title: 'Google Календарь', href: 'https://calendar.google.com/calendar/u/0/r' },
    ],
  },
  {
    title: 'Чаты и каналы',
    icon: 'chat',
    items: [
      { key: 'tg-team', title: 'Telegram: общий чат команды', href: 'https://t.me/example_team_chat' },
      { key: 'tg-trainees', title: 'Telegram: чат стажёров', href: 'https://t.me/example_trainees_chat' },
      { key: 'tg-offtopic', title: 'Telegram: мемы и флудилка', href: 'https://t.me/example_offtopic_chat' },
      { key: 'tg-security', title: 'Telegram: информационная безопасность', href: 'https://t.me/example_security_chat' },
      {
        key: 'discord-uchet',
        title: 'Discord: учёт сотрудников (#qc-control)',
        href: 'https://discord.com/channels/000000000000000000/000000000000000000',
      },
    ],
  },
]

// Плоская карта по ключу — для подстановки ссылок в шаги плана.
export const LINKS: Record<string, LinkItem> = Object.fromEntries(
  LINK_GROUPS.flatMap((g) => g.items).map((i) => [i.key, i]),
)
