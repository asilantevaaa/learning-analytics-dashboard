# Learning Analytics Dashboard

*[Русская версия ниже](#русская-версия) / Russian version below*

Learning-analytics dashboard for onboarding & training (React + TS + Node).

A tool for team leads and mentors to track new-hire onboarding: weekly progress
dashboards, probation exit criteria, a knowledge-base catalog, and automatic
metrics collection from Grafana.

## Features

- **Trainee progress dashboards** — weekly/monthly statistics per trainee, per
  mentor, per lead, or company-wide, with color-coded thresholds against
  onboarding-week norms.
- **Grafana metrics collection** — the backend proxies SQL queries to Grafana
  datasources to pull ticket counts, response/transfer/delay rates, and
  work-time-weighted speed, plus quality scores from a review datasource.
- **Configurable Grafana boards** — directors can add any other Grafana
  dashboard by UID from Settings; it shows up as a supplementary read-only
  widget on the Statistics page.
- **Scheduled auto-collection** — a cron-based job collects each week's
  metrics twice (a preliminary pass Friday morning, a final pass Friday
  evening); manual edits are preserved across re-collection.
- **CSV export** — weekly, monthly, and aggregate statistics tables can all be
  exported to CSV.
- **Roles & login** — director / manager / trainee roles, each scoped to the
  data they're allowed to see; simple token-based session auth with
  bcrypt-hashed passwords.
- **Dark theme** — a CSS-variable-based theme toggle with no flash-of-unstyled-theme
  on load.

## Architecture

**Frontend** — Vite + React + TypeScript, no router library: a small
hash-based router in `src/App.tsx` maps `location.hash` to page components and
gates navigation by role. Pages live in `src/pages/*`, static reference/plan
content in `src/data/*`.

**Backend** — Express (`server/index.js`) exposes a JSON API, serves the built
frontend in production, and runs the cron scheduler. `server/auth.js` handles
login/session (in-memory tokens, bcrypt password verification).
`server/grafana.js` and `server/metrics.js` proxy requests to Grafana — either
by replaying a dashboard's own panel queries, or via direct SQL against a
Grafana MySQL datasource — so the Grafana API token never reaches the browser.
`server/store.js` persists trainees, users, weekly snapshots, boards, and
settings as JSON files under `server/data/`.

**Data flow**: browser → Express API (Bearer token auth, role-scoped) →
either local JSON storage (`server/data/`) for trainees/weeks/settings, or a
proxied request to Grafana (`GRAFANA_URL` + `GRAFANA_TOKEN`) for metrics
collection. Collected weeks are cached as JSON snapshots so the dashboard
doesn't re-query Grafana on every page load.

## Getting started

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # fill in GRAFANA_URL / GRAFANA_TOKEN / datasource UIDs
npm run dev                 # http://localhost:8787

# 2. Frontend (in another terminal, from the repo root)
npm install
npm run dev                 # http://localhost:5173 (requests to /api are proxied to 8787)
```

**Demo login** (seeded automatically on first run if `server/data/users.json`
is empty): username `admin`, password `admin123`. Change it from the Users
page after logging in.

`server/data/` is gitignored (it can hold real trainee data and a live
Grafana token once you start using the app for real), so a fresh clone starts
empty — add trainees from the Statistics page and boards from Settings.
Connecting to a real Grafana instance requires network access to the host set
in `GRAFANA_URL`.

### Production (single process)

```bash
npm install && npm run build      # build the frontend into dist/
cd server && npm install && npm start
# Serves both the app and the API from http://localhost:8787 (same-origin, no CORS).
```

## Screenshots

_placeholder — add screenshots of the dashboard, weekly statistics, and plan pages here._

---

**Sanitized portfolio version** — real trainee data replaced with synthetic
demo data; internal endpoints, hostnames, document links, and credentials
removed.

<br>

---

## Русская версия

*[English version above](#learning-analytics-dashboard)*

Панель обучения-аналитики для онбординга и обучения стажёров (React + TS + Node).

Инструмент для тимлидов и наставников: отслеживание онбординга новых
сотрудников — недельные дашборды прогресса, критерии выхода с испытательного
срока, каталог базы знаний и автоматический сбор метрик из Grafana.

### Возможности

- **Дашборды прогресса стажёров** — недельная/помесячная статистика по
  стажёру, наставнику, лиду или в целом по компании, с цветовой индикацией
  относительно норм недели обучения.
- **Сбор метрик из Grafana** — бэкенд проксирует SQL-запросы к datasource'ам
  Grafana, чтобы получать количество тикетов, проценты ответов/передач/отложки
  и скорость с учётом взвешенного рабочего времени, а также оценки качества
  из datasource проверок.
- **Настраиваемые дашборды Grafana** — директор может добавить любой другой
  дашборд Grafana по UID в Настройках; он появится доп. виджетом на странице
  Статистики.
- **Автосбор по расписанию** — cron-задача дважды в неделю собирает метрики
  (предварительный проход в пятницу утром, финальный — вечером); ручные
  правки сохраняются при повторном сборе.
- **Выгрузка в CSV** — недельные, помесячные и сводные таблицы статистики
  экспортируются в CSV.
- **Роли и вход** — роли директор / менеджер / стажёр, каждая видит только
  разрешённые данные; простая токен-сессия с bcrypt-хэшированием паролей.
- **Тёмная тема** — переключатель темы на CSS-переменных без вспышки
  нестилизованной темы при загрузке.

### Архитектура

**Фронтенд** — Vite + React + TypeScript, без библиотеки роутинга: небольшой
роутер на хэше в `src/App.tsx` сопоставляет `location.hash` с компонентами
страниц и ограничивает навигацию по роли. Страницы — в `src/pages/*`,
статичный контент справочника/плана — в `src/data/*`.

**Бэкенд** — Express (`server/index.js`) отдаёт JSON API, раздаёт собранный
фронтенд в проде и запускает cron-планировщик. `server/auth.js` отвечает за
вход/сессию (токены в памяти, проверка пароля через bcrypt).
`server/grafana.js` и `server/metrics.js` проксируют запросы к Grafana — либо
повторяя запросы панелей самого дашборда, либо через прямой SQL к MySQL
datasource Grafana — так что токен Grafana API никогда не попадает в браузер.
`server/store.js` хранит стажёров, пользователей, недельные снапшоты, борды и
настройки в виде JSON-файлов в `server/data/`.

**Поток данных**: браузер → Express API (авторизация по Bearer-токену, с
учётом роли) → либо локальное JSON-хранилище (`server/data/`) для
стажёров/недель/настроек, либо проксированный запрос к Grafana (`GRAFANA_URL`
+ `GRAFANA_TOKEN`) для сбора метрик. Собранные недели кэшируются как
JSON-снапшоты, чтобы дашборд не запрашивал Grafana заново при каждой загрузке
страницы.

### Быстрый старт

```bash
# 1. Бэкенд
cd server
npm install
cp .env.example .env        # заполни GRAFANA_URL / GRAFANA_TOKEN / UID datasource'ов
npm run dev                 # http://localhost:8787

# 2. Фронтенд (в другом терминале, из корня репозитория)
npm install
npm run dev                 # http://localhost:5173 (запросы к /api проксируются на 8787)
```

**Демо-вход** (создаётся автоматически при первом запуске, если
`server/data/users.json` пуст): логин `admin`, пароль `admin123`. Смени его на
странице пользователей после входа.

`server/data/` в .gitignore (там может оказаться реальная информация о
стажёрах и живой токен Grafana после начала реального использования),
поэтому после клонирования папка пуста — добавляй стажёров на странице
Статистики, а борды — в Настройках. Для подключения к реальной Grafana
нужен сетевой доступ к хосту из `GRAFANA_URL`.

#### Прод (один процесс)

```bash
npm install && npm run build      # собрать фронтенд в dist/
cd server && npm install && npm start
# И сайт, и API отдаются с http://localhost:8787 (same-origin, без CORS).
```

### Скриншоты

_плейсхолдер — добавь сюда скриншоты дашборда, недельной статистики и плана онбординга._

---

**Санитизированная портфолио-версия** — реальные данные стажёров заменены
синтетическими демо-данными; внутренние эндпоинты, хосты, ссылки на документы
и учётные данные удалены.
