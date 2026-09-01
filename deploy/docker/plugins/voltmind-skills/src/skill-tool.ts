import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SkillToolMeta {
  /** 工具名（tool.json 必填） */
  name: string
  /** 一句话描述（含触发词） */
  description: string
  /** 参数（值期望兼容 dsh `ParameterSchemaSpec`：{ key: { type, ... } }） */
  parameters: ParameterSchemaSpec
  /** 输出 object 属性（兼容 ValueSchemaSpec 属性表） */
  outputProperties?: ParameterSchemaSpec
}

export interface ScriptRunner {
  (scriptPath: string, jsonArgs: string): { ok: boolean; stdout: string; stderr: string }
}

export const defaultRunner: ScriptRunner = (scriptPath, jsonArgs) => {
  const python = process.env.VOLTMIND_PYTHON ?? 'python'
  const result = spawnSync(python, [scriptPath, jsonArgs], { encoding: 'utf8', timeout: 60_000 })
  return { ok: result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/** 读取 skills/<dir>/tool.json（返回 undefined 表示该技能无脚本工具）。 */
export function loadSkillTool(skillsRoot: string, dir: string): (SkillToolMeta & { scriptPath: string }) | undefined {
  const dirPath = join(skillsRoot, dir)
  const toolFile = join(dirPath, 'tool.json')
  const scriptFile = join(dirPath, 'script.py')
  if (!existsSync(toolFile) || !existsSync(scriptFile)) return undefined
  try {
    const meta = JSON.parse(readFileSync(toolFile, 'utf8')) as SkillToolMeta
    return { ...meta, scriptPath: scriptFile }
  } catch {
    return undefined
  }
}

function text(value: string): ContentBlock[] {
  return [{ type: 'text', text: value }]
}

/** 把一个技能目录的 script.py + tool.json 注册为 agent 工具。 */
export function skillTool(dir: string, meta: SkillToolMeta & { scriptPath: string }, runner: ScriptRunner = defaultRunner) {
  const outputSchema = {
    type: 'object',
    additionalProperties: false,
    properties: meta.outputProperties ?? {},
  } as const
  return defineTool({
    name: meta.name,
    description: meta.description,
    parameters: meta.parameters,
    output: {
      schema: outputSchema as never,
      render: (_args, value) => text(JSON.stringify(value, null, 2)),
    },
    async execute(args, _exec) {
      const result = runner(meta.scriptPath, JSON.stringify(args ?? {}))
      if (!result.ok) throw new Error(`${dir} script failed: ${result.stderr || result.stdout}`)
      try {
        return JSON.parse(result.stdout) as never
      } catch {
        return { stdout: result.stdout } as never
      }
    },
  })
}
