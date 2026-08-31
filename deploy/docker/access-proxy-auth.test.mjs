import assert from 'node:assert/strict'
import { requestToken, tokensEqual } from './access-proxy-auth.mjs'
import { test } from 'node:test'

test('only the access-token header is accepted', () => {
  const got = requestToken({
    headers: {
      'x-dsh-access-token': 'from-header',
      cookie: 'dsh_access_10013=from-cookie',
    },
  })
  assert.equal(got, 'from-header')
})

test('query and cookie tokens are ignored', () => {
  const got = requestToken({
    url: '/?access_token=from-query',
    headers: {
      host: '192.168.5.169:10013',
      cookie: 'dsh_access_10013=from-cookie',
    },
  })
  assert.equal(got, undefined)
})

test('tokensEqual matches utf8 bytes', () => {
  assert.equal(tokensEqual('155fec6318ba4d878de3ecddb7525181', '155fec6318ba4d878de3ecddb7525181'), true)
  assert.equal(tokensEqual('stale', '155fec6318ba4d878de3ecddb7525181'), false)
})
