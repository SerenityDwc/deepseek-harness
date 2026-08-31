#!/usr/bin/env node
/**
 * VoltClaw injects DEEPSEEK_BASE_URL as the internal LLM proxy.
 * The Models page / settings.yaml baseURL otherwise wins over process env
 * and chat goes to api.deepseek.com, never hitting VoltClaw.
 */
import fs from 'node:fs'
import path from 'node:path'

const url = (process.env.DEEPSEEK_BASE_URL ?? '').trim()
if (!url) {
  process.exit(0)
}

const home = process.env.DSH_HOME || '/root/.dsh'
const file = path.join(home, 'settings.yaml')
fs.mkdirSync(home, { recursive: true })
let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
text = text.replace(/\n?# voltclaw-pinned\nllm-deepseek:\n  baseURL: .*\n/g, '\n')
if (text.length > 0 && !text.endsWith('\n')) {
  text += '\n'
}
fs.writeFileSync(file, `${text}# voltclaw-pinned\nllm-deepseek:\n  baseURL: ${url}\n`)
process.stdout.write(`pinned DEEPSEEK_BASE_URL=${url}\n`)
