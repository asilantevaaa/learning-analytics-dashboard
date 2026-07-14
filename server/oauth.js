// Проверка подлинности данных от Telegram Login Widget и Google Identity Services.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'

const DAY = 86400000

// Алгоритм Telegram: https://core.telegram.org/widgets/login#checking-authorization
// data-check-string = все поля кроме hash, отсортированные по ключу, "key=value" через \n;
// секрет = sha256(bot_token); подпись = hmac-sha256(секрет, data-check-string).
export function verifyTelegramAuth(data, botToken) {
  if (!data || !botToken || typeof data.hash !== 'string') return false
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')
  const secretKey = createHash('sha256').update(botToken).digest()
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex')

  const a = Buffer.from(hmac, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  const authDateMs = Number(rest.auth_date) * 1000
  if (!Number.isFinite(authDateMs) || Date.now() - authDateMs > DAY) return false // защита от повторного использования
  return true
}

// Проверка ID-токена (JWT) от Google Identity Services — подпись и издатель проверяются
// библиотекой по актуальным публичным ключам Google.
export async function verifyGoogleCredential(credential, clientId) {
  if (!credential || !clientId) return null
  const client = new OAuth2Client(clientId)
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
  const payload = ticket.getPayload()
  if (!payload?.sub) return null
  return { sub: payload.sub, email: payload.email || null, name: payload.name || null }
}
