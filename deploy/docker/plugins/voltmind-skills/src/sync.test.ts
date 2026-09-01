import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { syncDirectory, dshHome } from './sync.ts'

let tmp: string
let env: NodeJS.ProcessEnv

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'voltmind-sync-'))
  env = { DSH_HOME: tmp }
})
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('syncDirectory', () => {
  it('把插件技能目录复制进 DSH_HOME/skills 并报告新建与复制数', () => {
    const source = join(tmp, 'src-skills')
    mkdirSync(join(source, 'voltcell'), { recursive: true })
    writeFileSync(join(source, 'voltcell', 'SKILL.md'), '---\nname: voltcell\n---\n# x\n')

    const plan = syncDirectory(source, 'skills', env)

    expect(plan.created).toEqual([join(tmp, 'skills', 'voltcell')])
    expect(existsSync(join(tmp, 'skills', 'voltcell', 'SKILL.md'))).toBe(true)
    expect(plan.copied).toBe(1)
  })

  it('覆盖已存在目录（插件为权威版本）', () => {
    const source = join(tmp, 'src-skills')
    mkdirSync(join(source, 'voltcell'), { recursive: true })
    writeFileSync(join(source, 'voltcell', 'SKILL.md'), 'v2')
    mkdirSync(join(tmp, 'skills', 'voltcell'), { recursive: true })
    writeFileSync(join(tmp, 'skills', 'voltcell', 'SKILL.md'), 'v1')

    syncDirectory(source, 'skills', env)

    expect(readFileSync(join(tmp, 'skills', 'voltcell', 'SKILL.md'), 'utf8')).toBe('v2')
  })

  it('dshHome 尊重 DSH_HOME 环境变量，缺省为 ~/.dsh', () => {
    expect(dshHome(env)).toBe(tmp)
    expect(dshHome({})).toBe(join(homedir(), '.dsh'))
  })
})
