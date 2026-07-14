import { useEffect, useState } from 'react'
import { api, auth, type OAuthConfig, type TelegramAuthData, type User } from '../api'
import Icon from '../components/Icon'
import TelegramLoginButton from '../components/TelegramLoginButton'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [oauth, setOauth] = useState<OAuthConfig | null>(null)

  useEffect(() => {
    api.getOAuthConfig().then(setOauth).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token, user } = await api.login(username.trim(), password)
      auth.set(token)
      onLogin(user)
    } catch (err: any) {
      setError(err.message || 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  async function telegramAuth(data: TelegramAuthData) {
    setError('')
    try {
      const { token, user } = await api.loginTelegram(data)
      auth.set(token)
      onLogin(user)
    } catch (err: any) {
      setError(err.message || 'Ошибка входа через Telegram')
    }
  }

  async function googleAuth(credential: string) {
    setError('')
    try {
      const { token, user } = await api.loginGoogle(credential)
      auth.set(token)
      onLogin(user)
    } catch (err: any) {
      setError(err.message || 'Ошибка входа через Google')
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-card__brand">
          <div className="sidebar__logo">
            <Icon name="graduation" size={22} />
          </div>
          <div>
            <div className="sidebar__title">Свод обучения</div>
            <div className="sidebar__subtitle">Вход в систему</div>
          </div>
        </div>

        <div className="field">
          <label>Логин</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="admin" />
        </div>
        <div className="field">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </div>

        {error && (
          <div className="callout callout--warn" style={{ margin: '4px 0' }}>
            <Icon name="alert" size={16} /> {error}
          </div>
        )}

        <button className="btn" type="submit" disabled={busy || !username || !password} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'Вход…' : 'Войти'}
        </button>

        {(oauth?.telegramBotUsername || oauth?.googleClientId) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <div className="muted" style={{ fontSize: 13 }}>или войди через</div>
            {oauth.telegramBotUsername && <TelegramLoginButton botUsername={oauth.telegramBotUsername} onAuth={telegramAuth} />}
            {oauth.googleClientId && <GoogleLoginButton clientId={oauth.googleClientId} onCredential={googleAuth} />}
          </div>
        )}
      </form>
    </div>
  )
}
