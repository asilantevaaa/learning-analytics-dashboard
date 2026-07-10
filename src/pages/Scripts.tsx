import { SCRIPT_FILES, MENU_ACTIONS } from '../data/stats'
import Icon from '../components/Icon'

export default function Scripts() {
  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Автоматизация</span>
        <h1>Скрипты таблицы «Обучение»</h1>
        <p>
          В Google-таблице работает Apps Script: меню <b>«Меню»</b> с формами зачисления, ввода статистики и
          месячных отчётов. Всё вносится через формы — это защищает формулы от поломки.
        </p>
      </div>

      <div className="callout">
        Актуальный код всегда в самой таблице: <b>Расширения → Apps Script</b>. По проблемам обращайся к тимлиду
        своей команды в общем чате. Если что-то сломалось — восстанови версию файла через «История версий».
      </div>

      <h2 className="section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="gear" size={18} /> Действия меню
      </h2>
      <table className="data">
        <thead>
          <tr>
            <th>Пункт меню</th>
            <th>Что делает</th>
          </tr>
        </thead>
        <tbody>
          {MENU_ACTIONS.map((a) => (
            <tr key={a.fn}>
              <td style={{ fontWeight: 600 }}>{a.label}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{a.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="folder" size={18} /> Файлы Apps Script
      </h2>
      <table className="data">
        <thead>
          <tr>
            <th>Файл</th>
            <th>Пункт меню</th>
            <th>Роль</th>
          </tr>
        </thead>
        <tbody>
          {SCRIPT_FILES.map((f) => (
            <tr key={f.file}>
              <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{f.file}</td>
              <td>{f.menu}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{f.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="clipboard" size={18} /> Что важно помнить
      </h2>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)' }}>
          <li>Не вписывай данные в таблицу руками — только через формы меню.</li>
          <li>Зачисление считает контрольные точки: даты ОС на 1 и 3 месяца, даты проверок.</li>
          <li>«Завершил обучение» / «Уволился» — скрывают строку на трёх листах, но сохраняют историю.</li>
          <li>Форма не создаёт дубли: повторная неделя обновляет существующую запись.</li>
          <li>Месячный отчёт берёт данные из листа «Статистика NEW»; скрытые строки в отчёт не попадают.</li>
        </ul>
      </div>
    </div>
  )
}
