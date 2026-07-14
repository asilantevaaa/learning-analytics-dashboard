// Официальный виджет Telegram Login. Документация: https://core.telegram.org/widgets/login
import { useEffect, useRef } from 'react'
import type { TelegramAuthData } from '../api'

declare global {
  interface Window {
    onTelegramAuth?: (data: TelegramAuthData) => void
  }
}

export default function TelegramLoginButton({ botUsername, onAuth }: { botUsername: string; onAuth: (data: TelegramAuthData) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.onTelegramAuth = onAuth
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    ref.current?.appendChild(script)
    return () => {
      delete window.onTelegramAuth
      ref.current?.replaceChildren()
    }
  }, [botUsername, onAuth])

  return <div ref={ref} />
}
