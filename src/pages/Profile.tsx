import { useEffect, useState } from 'react'
import { api, type OAuthConfig, type TelegramAuthData, type User } from '../api'
import Icon from '../components/Icon'
import TelegramLoginButton from '../components/TelegramLoginButton'
import GoogleLoginButton from '../components/GoogleLoginButton'

const ROLE_LABEL: Record<string, string> = {
  director: 'Руководитель',
  manager: 'Менеджер обучения',
  trainee: 'Стажёр',
}

export default function Profile({ user, onUserUpdate }: { user: User; onUserUpdate: (u: User) => void }) {
  const [oauth, setOauth] = useState<OAuthConfig | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getOAuthConfig().then(setOauth).catch(() => {})
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function linkTelegram(data: TelegramAuthData) {
    setBusy(true)
    try {
      onUserUpdate(await api.linkTelegram(data))
      flash(true, 'Telegram привязан.')
    } catch (e: any) {
      flash(false, e.message)
    } finally {
      setBusy(false)
    }
  }
  async function unlinkTelegram() {
    setBusy(true)
    try {
      onUserUpdate(await api.unlinkTelegram())
      flash(true, 'Telegram отвязан.')
    } catch (e: any) {
      flash(false, e.message)
    } finally {
      setBusy(false)
    }
  }
  async function linkGoogle(credential: string) {
    setBusy(true)
    try {
      onUserUpdate(await api.linkGoogle(credential))
      flash(true, 'Google привязан.')
    } catch (e: any) {
      flash(false, e.message)
    } finally {
      setBusy(false)
    }
  }
  async function unlinkGoogle() {
    setBusy(true)
    try {
      onUserUpdate(await api.unlinkGoogle())
      flash(true, 'Google отвязан.')
    } catch (e: any) {
      flash(false, e.message)
    } finally {
      setBusy(false)
    }
  }

  const noneConfigured = oauth && !oauth.telegramBotUsername && !oauth.googleClientId

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Аккаунт</span>
        <h1>Профиль</h1>
        <p>Твои данные и способы входа в систему.</p>
      </div>

      <div className="form-card">
        <div className="form-card__title">{user.name}</div>
        <p className="muted" style={{ marginTop: -4 }}>
          Логин: {user.username} · Роль: {ROLE_LABEL[user.role] || user.role}
        </p>
      </div>

      <div className="form-card" style={{ marginTop: 24 }}>
        <div className="form-card__title">Связанные аккаунты</div>
        <p className="muted" style={{ marginTop: -4 }}>
          Привяжи Telegram или Google, чтобы в следующий раз входить без пароля.
        </p>

        {msg && (
          <div className={'callout' + (msg.ok ? '' : ' callout--warn')}>
            <Icon name={msg.ok ? 'check' : 'alert'} size={16} /> {msg.text}
          </div>
        )}

        {noneConfigured && (
          <p className="muted">Директор ещё не настроил вход через Telegram или Google в Настройках.</p>
        )}

        {oauth?.telegramBotUsername && (
          <div className="form-card__foot" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>
              Telegram — {user.hasTelegram ? <b>привязан</b> : <span className="muted">не привязан</span>}
            </span>
            {user.hasTelegram ? (
              <button className="btn btn--sm" onClick={unlinkTelegram} disabled={busy}>
                Отвязать
              </button>
            ) : (
              <TelegramLoginButton botUsername={oauth.telegramBotUsername} onAuth={linkTelegram} />
            )}
          </div>
        )}

        {oauth?.googleClientId && (
          <div className="form-card__foot" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>
              Google — {user.hasGoogle ? <b>привязан</b> : <span className="muted">не привязан</span>}
            </span>
            {user.hasGoogle ? (
              <button className="btn btn--sm" onClick={unlinkGoogle} disabled={busy}>
                Отвязать
              </button>
            ) : (
              <GoogleLoginButton clientId={oauth.googleClientId} onCredential={linkGoogle} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
