// Кнопка «Войти через Google» на Google Identity Services (GIS).
// Документация: https://developers.google.com/identity/gsi/web
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: any
  }
}

let gisLoad: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!gisLoad) {
    gisLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'))
      document.head.appendChild(script)
    })
  }
  return gisLoad
}

export default function GoogleLoginButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    loadGis().then(() => {
      if (cancelled || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: { credential: string }) => onCredential(resp.credential),
      })
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 280 })
    })
    return () => {
      cancelled = true
    }
  }, [clientId, onCredential])

  return <div ref={ref} />
}
