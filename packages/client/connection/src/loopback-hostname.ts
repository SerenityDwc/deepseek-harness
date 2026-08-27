/**
 * Browser-safe, zero-dependency loopback classification shared by the `/api`
 * Host fence and the package's `ctx.connection` state. The predicate stays
 * package-internal; client plugins consume the derived state through Cordis.
 */

/**
 * Whether a normalized URL hostname names the local loopback authority.
 * @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
 * @returns true for localhost, IPv6 loopback, or any IPv4 address in 127/8.
 */
export function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/**
 * Whether a WHATWG hostname is a canonical IP literal (dotted IPv4, or an
 * IPv6 address in Host form, with or without brackets). Non-canonical
 * spellings that WHATWG would rewrite are not IP literals here; they fail
 * parse or remain names.
 * @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
 * @returns true when the hostname is an IP literal in wire-canonical form.
 */
export function isCanonicalIpLiteralHostname(hostname: string): boolean {
  if (/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/.test(hostname)) {
    return true
  }
  const inner = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
  if (!inner.includes(':')) return false
  try {
    return new URL(`http://[${inner}]`).hostname.length > 0
  } catch {
    return false
  }
}
