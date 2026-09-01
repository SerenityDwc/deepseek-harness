import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export function dshHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.DSH_HOME ?? join(homedir(), '.dsh')
}

export interface SyncPlan {
  /** 目标目录中本次新建的目录 */
  created: string[]
  /** 复制的源文件数 */
  copied: number
}

function countFiles(dir: string): number {
  let n = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1
  }
  return n
}

/**
 * 把插件随包的 `source` 顶层子目录逐一复制到 `<DSH_HOME>/<kind>/<name>/`。
 * 覆盖式（插件为权威版本）。
 */
export function syncDirectory(source: string, kind: 'skills' | '.agent-presets', env: NodeJS.ProcessEnv = process.env): SyncPlan {
  const dest = join(dshHome(env), kind)
  mkdirSync(dest, { recursive: true })
  const created: string[] = []
  let copied = 0
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const from = join(source, entry.name)
    const to = join(dest, entry.name)
    if (!existsSync(to)) created.push(to)
    copied += countFiles(from)
    cpSync(from, to, { recursive: true, force: true })
  }
  return { created, copied }
}
