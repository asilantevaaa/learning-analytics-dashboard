import { useEffect, useMemo, useState } from 'react'
import { api, type UserRecord, type Role, type Meta } from '../api'
import type { Trainee } from '../data/norms'
import Icon from '../components/Icon'

const uid = () => Math.random().toString(36).slice(2, 9)
const ROLE_LABEL: Record<Role, string> = {
  director: 'Руководитель',
  manager: 'Менеджер обучения',
  trainee: 'Стажёр',
}

export default function Users() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [meta, setMeta] = useState<Meta>({ mentors: [], leads: [] })
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [draft, setDraft] = useState<UserRecord>({ id: uid(), username: '', password: '', role: 'manager', name: '', mentor: '', login: '' })

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {})
    api.getMeta().then(setMeta).catch(() => {})
    api.getTrainees().then(setTrainees).catch(() => {})
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function save(next: UserRecord[]) {
    setUsers(next)
    try {
      await api.setUsers(next)
      flash(true, 'Сохранено.')
    } catch (e: any) {
      flash(false, e.message)
    }
  }

  const traineeOptions = useMemo(
    () => [...trainees].sort((a, b) => a.name.localeCompare(b.name)),
    [trainees],
  )

  const add = () => {
    if (!draft.username.trim() || !draft.password?.trim()) return flash(false, 'Укажи логин и пароль')
    if (draft.role === 'manager' && !draft.mentor) return flash(false, 'Выбери наставника для менеджера')
    if (draft.role === 'trainee' && !draft.login) return flash(false, 'Выбери стажёра')
    const rec: UserRecord = { ...draft, id: uid(), username: draft.username.trim() }
    save([...users, rec])
    setDraft({ id: uid(), username: '', password: '', role: 'manager', name: '', mentor: '', login: '' })
  }
  const remove = (id: string) => save(users.filter((u) => u.id !== id))
  const patch = (id: string, p: Partial<UserRecord>) => save(users.map((u) => (u.id === id ? { ...u, ...p } : u)))

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Администрирование</span>
        <h1>Пользователи</h1>
        <p>Доступы: руководитель — все стажёры; менеджер обучения — стажёры своего наставника; стажёр — только свои метрики.</p>
      </div>

      {msg && (
        <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
        </div>
      )}

      <div className="form-card">
        <div className="form-card__title">Добавить пользователя</div>
        <div className="form-grid">
          <div className="field">
            <label>Логин</label>
            <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="ivan" />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="••••••" />
          </div>
          <div className="field">
            <label>Имя</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Иван Иванов" />
          </div>
          <div className="field">
            <label>Роль</label>
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
              <option value="director">Руководитель</option>
              <option value="manager">Менеджер обучения</option>
              <option value="trainee">Стажёр</option>
            </select>
          </div>
          {draft.role === 'manager' && (
            <div className="field">
              <label>Наставник (его стажёры)</label>
              <select value={draft.mentor} onChange={(e) => setDraft({ ...draft, mentor: e.target.value })}>
                <option value="">— выбрать —</option>
                {meta.mentors.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          {draft.role === 'trainee' && (
            <div className="field">
              <label>Стажёр</label>
              <select value={draft.login} onChange={(e) => setDraft({ ...draft, login: e.target.value })}>
                <option value="">— выбрать —</option>
                {traineeOptions.map((t) => (
                  <option key={t.login} value={t.login}>{t.name} ({t.login})</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="form-card__foot">
          <span className="muted">Менеджер видит стажёров выбранного наставника, стажёр — только себя.</span>
          <button className="btn" onClick={add}>
            <Icon name="plus" size={16} /> Добавить
          </button>
        </div>
      </div>

      <table className="data" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Логин</th>
            <th>Имя</th>
            <th>Роль</th>
            <th>Область</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 600 }}>{u.username}</td>
              <td>{u.name || '—'}</td>
              <td>{ROLE_LABEL[u.role]}</td>
              <td className="muted">
                {u.role === 'manager' ? `наставник: ${u.mentor || '—'}` : u.role === 'trainee' ? `стажёр: ${u.login || '—'}` : 'все стажёры'}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="tag-remove" title="Удалить" onClick={() => remove(u.id)} disabled={u.role === 'director' && users.filter((x) => x.role === 'director').length <= 1}>
                  <Icon name="close" size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted" style={{ marginTop: 8 }}>
        Пароль можно изменить, пересоздав пользователя. Нельзя удалить последнего руководителя.
      </div>

      {/* быстрая правка пароля */}
      <h2 className="section">Смена пароля</h2>
      <div className="form-grid">
        {users.map((u) => (
          <div className="field" key={u.id}>
            <label>{u.username} ({ROLE_LABEL[u.role]})</label>
            <input
              type="text"
              defaultValue={u.password || ''}
              placeholder="новый пароль"
              onBlur={(e) => e.target.value && e.target.value !== u.password && patch(u.id, { password: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
