import type { Context } from '@deepseek-ai/cordis'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-session'
import { syncDirectory } from './sync.ts'
import { loadSkillTool, skillTool } from './skill-tool.ts'
import { makeEmitTool } from './emit-artifact.ts'

export const name = 'voltmind-skills'
export const inject = ['tools', 'systemPrompt', 'workspaceRegistry', 'sessions']

const here = dirname(fileURLToPath(import.meta.url))
const SKILLS_SOURCE = join(here, '..', 'skills')
const PRESETS_SOURCE = join(here, '..', 'presets')

/** 解析当前会话工作区绝对路径（复用 voltmind-upload 的解析策略）。 */
function resolveWorkspace(ctx: Context): () => string {
  return () => {
    const sorted = [...ctx.sessions.list()].sort((a, b) => b.header.createdAt - a.header.createdAt)
    for (const session of sorted) {
      if (session.header.cwd !== undefined) return session.header.cwd
    }
    const first = ctx.workspaceRegistry.list()[0]
    return first?.path ?? process.cwd()
  }
}

/** 扫描技能目录，为带 tool.json+script.py 的技能注册 agent 工具。 */
function registerSkillTools(ctx: Context): () => void {
  const disposers: Array<() => void> = []
  try {
    const dirs = readdirSync(SKILLS_SOURCE, { withFileTypes: true }).filter((d) => d.isDirectory())
    for (const dir of dirs) {
      const meta = loadSkillTool(SKILLS_SOURCE, dir.name)
      if (meta === undefined) continue
      disposers.push(ctx.tools.register(skillTool(dir.name, meta)))
      ctx.logger.info(`[voltmind-skills] registered skill tool "${meta.name}" from skills/${dir.name}`)
    }
  } catch (error) {
    ctx.logger.warn(`[voltmind-skills] skill-tool scan failed: ${String(error)}`)
  }
  return () => { for (const dispose of disposers) dispose() }
}

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const skills = syncDirectory(SKILLS_SOURCE, 'skills')
    const presets = syncDirectory(PRESETS_SOURCE, '.agent-presets')
    ctx.logger.info('[voltmind-skills] synced skills=%o presets=%o', skills, presets)
    return () => {}
  }, 'voltmind-skills: sync on start')

  ctx.effect(() => registerSkillTools(ctx), 'voltmind-skills: skill tools')

  // 通用产物登记工具 voltmind_emit（不依赖具体技能，供 voltcell/数据分析/报告等所有技能共用）
  ctx.effect(() => ctx.tools.register(makeEmitTool(resolveWorkspace(ctx))), 'voltmind-skills: emit artifact tool')
}
