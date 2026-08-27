/** Shared loopback-hostname semantics for the Host fence and browser UI. */

import { describe, expect, it } from 'vitest'
import { isCanonicalIpLiteralHostname, isLoopbackHostname } from '../src/loopback-hostname.ts'

describe('isLoopbackHostname', () => {
  it('accepts localhost, IPv6 loopback, and the whole IPv4 127/8 block', () => {
    for (const hostname of ['localhost', '[::1]', '127.0.0.1', '127.8.9.10', '127.255.255.255']) {
      expect(isLoopbackHostname(hostname)).toBe(true)
    }
  })

  it('refuses malformed and non-loopback hostnames', () => {
    for (const hostname of ['remote.localhost', '::1', '128.0.0.1', '127.0.0', '127.0.0.256', '127.0.0.-1']) {
      expect(isLoopbackHostname(hostname)).toBe(false)
    }
  })
})

describe('isCanonicalIpLiteralHostname', () => {
  it('accepts dotted IPv4 and bracketed IPv6', () => {
    for (const hostname of ['192.0.2.20', '203.0.113.10', '[::1]', '[2001:db8::1]']) {
      expect(isCanonicalIpLiteralHostname(hostname)).toBe(true)
    }
  })

  it('refuses DNS names', () => {
    for (const hostname of ['localhost', 'remote.localhost', 'harness.example']) {
      expect(isCanonicalIpLiteralHostname(hostname)).toBe(false)
    }
  })
})
