/** Token helpers for `access-proxy.mjs`. */
import crypto from 'node:crypto'

/**
 * Server-side reverse proxies present `x-dsh-access-token`.
 * Browser cookies and query tokens are ignored so a leftover cookie after
 * logout cannot open a published port.
 * @param {{ headers: Record<string, string | string[] | undefined> }} req
 * @returns {string | undefined}
 */
export function requestToken(req) {
  const header = req.headers['x-dsh-access-token']
  if (typeof header === 'string' && header) return header
  if (Array.isArray(header) && header[0]) return header[0]
  return undefined
}

/**
 * @param {unknown} provided
 * @param {string} token
 * @returns {boolean}
 */
export function tokensEqual(provided, token) {
  const a = Buffer.from(String(provided ?? ''), 'utf8')
  const b = Buffer.from(token, 'utf8')
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b)
    return false
  }
  return crypto.timingSafeEqual(a, b)
}
