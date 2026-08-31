#!/usr/bin/env node
/**
 * Optional published-port gate for the Web image.
 * Listens on DSH_LISTEN_PORT / PORT and reverse-proxies to
 * 127.0.0.1:DSH_UPSTREAM_PORT without rewriting Host or Origin.
 * A non-empty DSH_ACCESS_TOKEN is required on non-loopback requests
 * (`x-dsh-access-token` only). Query and cookie tokens are ignored.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'
import { requestToken as readRequestToken, tokensEqual as bytesEqual } from './access-proxy-auth.mjs'

const TOKEN = process.env.DSH_ACCESS_TOKEN ?? ''
const LISTEN_PORT = Number(process.env.DSH_LISTEN_PORT || process.env.PORT || 3080)
const UPSTREAM_PORT = Number(process.env.DSH_UPSTREAM_PORT || LISTEN_PORT + 1)
const childArgs = process.argv.slice(2)

if (!TOKEN) {
  console.error('dsh docker: access-proxy requires DSH_ACCESS_TOKEN')
  process.exit(1)
}
if (!Number.isInteger(LISTEN_PORT) || LISTEN_PORT < 0 || LISTEN_PORT > 65535) {
  console.error(`dsh docker: invalid listen port ${process.env.DSH_LISTEN_PORT || process.env.PORT}`)
  process.exit(1)
}
if (!Number.isInteger(UPSTREAM_PORT) || UPSTREAM_PORT < 0 || UPSTREAM_PORT > 65535 || UPSTREAM_PORT === LISTEN_PORT) {
  console.error(`dsh docker: invalid upstream port ${UPSTREAM_PORT}`)
  process.exit(1)
}
if (childArgs.length === 0) {
  console.error('dsh docker: access-proxy requires the dsh command as arguments')
  process.exit(1)
}

function isLoopback(req) {
  const ip = req.socket.remoteAddress
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}

function isAuthorized(req) {
  return isLoopback(req) || bytesEqual(readRequestToken(req), TOKEN)
}

function deny(req, res) {
  const wantsHtml = String(req.headers.accept ?? '').includes('text/html')
  res.statusCode = 401
  if (wantsHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(
      '<!doctype html><meta charset="utf-8"><title>Unauthorized</title>' +
      '<p>Open this workbench from VoltClaw. Direct access is not allowed.</p>' +
      '<p>请从 VoltClaw 点击「打开工作台」进入，不能直接访问此地址。</p>',
    )
    return
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Unauthorized\n')
}

function denyUpgrade(socket) {
  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
  socket.destroy()
}

function hopByHop() {
  return new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
  ])
}

function forwardHeaders(src) {
  const skip = hopByHop()
  const headers = {}
  for (const [name, value] of Object.entries(src)) {
    if (value == null || skip.has(name.toLowerCase())) continue
    headers[name] = value
  }
  return headers
}

function proxyHttp(req, res) {
  const headers = forwardHeaders(req.headers)
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: UPSTREAM_PORT,
    path: req.url,
    method: req.method,
    headers,
  }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers)
    up.pipe(res)
  })
  upstream.on('error', () => {
    if (res.headersSent) {
      res.destroy()
      return
    }
    res.statusCode = 502
    res.end('Bad Gateway\n')
  })
  req.pipe(upstream)
}

function proxyUpgrade(req, socket, head) {
  const headers = forwardHeaders(req.headers)
  headers.Connection = 'Upgrade'
  if (req.headers.upgrade) headers.Upgrade = req.headers.upgrade
  const upstream = net.connect(UPSTREAM_PORT, '127.0.0.1', () => {
    const path = req.url ?? '/'
    let payload = `${req.method} ${path} HTTP/1.1\r\n`
    for (const [name, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) payload += `${name}: ${item}\r\n`
      } else {
        payload += `${name}: ${value}\r\n`
      }
    }
    payload += '\r\n'
    upstream.write(payload)
    if (head && head.length) upstream.write(head)
    upstream.pipe(socket)
    socket.pipe(upstream)
  })
  upstream.on('error', () => socket.destroy())
  socket.on('error', () => upstream.destroy())
}

const child = spawn(childArgs[0], childArgs.slice(1), {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(UPSTREAM_PORT) },
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})

const server = http.createServer((req, res) => {
  if (!isAuthorized(req)) {
    deny(req, res)
    return
  }
  proxyHttp(req, res)
})

server.on('upgrade', (req, socket, head) => {
  if (!isAuthorized(req)) {
    denyUpgrade(socket)
    return
  }
  proxyUpgrade(req, socket, head)
})

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.error(`dsh docker: access proxy listening on 0.0.0.0:${LISTEN_PORT} -> 127.0.0.1:${UPSTREAM_PORT}`)
})

function shutdown(signal) {
  server.close()
  if (child.pid) child.kill(signal)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
