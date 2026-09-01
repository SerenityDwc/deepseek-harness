import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { existsSync } from 'node:fs'
import { basename, resolve, sep } from 'node:path'

/** voltage_emit 的单个产物条目（模型传入）。 */
export interface EmitFileArg {
  /** 相对当前工作区的路径，或可被工作区解析的路径。 */
  path: string
  /** 展示名，缺省用 basename。 */
  title?: string
  /** 文件类型提示（xlsx/pdf/png/md/html/csv…），用于呈现标注。 */
  kind?: string
}

/** 已登记的一个产物（execute 返回给模型的结构化结果）。 */
export interface RegisteredArtifact {
  path: string
  abs: string
  title: string
  kind: string
}

function text(value: string): ContentBlock[] {
  return [{ type: 'text', text: value }]
}

/**
 * 通用产物登记工具 `voltmind_emit`。
 *
 * 模型/技能产出文件后（文本或二进制 xlsx/pdf/png 等），调用它声明这批文件为产物。
 * - `presentCall` 返回 `{ card:'generic', kind:'edit', locations:[{path}] }`，
 *   DSH `ui-deliverables` 据此把这些路径计入 produced → 回合收尾渲染可点产物卡片，
 *   点击走 openPath → better-sidebar → office viewer 预览 / binary-download。
 * - `execute` 做真实校验：路径必须位于当前工作区内、且文件真实存在（防目录穿越/越权登记）。
 *
 * @param resolveWorkspace 返回当前会话工作区绝对路径（延迟到调用时求值，避免注册时未就绪）。
 */
export function makeEmitTool(resolveWorkspace: () => string) {
  return defineTool({
    name: 'voltmind_emit',
    description:
      '通用产物登记：把已生成的文件声明为可点/可预览/可下载的产物卡片。支持 md/html/csv/xlsx/pdf/png、zip 等任意扩展名。参数 files: [{path, title?, kind?}]，path 相对当前工作区。',
    parameters: {
      files: {
        type: 'array',
        required: true,
        description: '要登记为产物的文件列表，每个元素 {path, title?, kind?}',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            path: { type: 'string', description: '相对当前工作区的文件路径' },
            title: { type: 'string', description: '展示名（可选，缺省用文件名）' },
            kind: { type: 'string', description: '类型提示（xlsx/pdf/png/md/html/csv…，可选）' },
          },
        },
      },
    },
    output: {
      schema: {
        type: 'json' as const,
        description: '已登记产物清单 { registered: [{path, abs, title, kind}] }',
      } as never,
      render: (_args, value) => text(JSON.stringify(value, null, 2)),
    },
    // 关键：render intent 声明为 edit + locations（纯函数，只依赖 args）→ 让 DSH 计入 produced。
    presentCall(args): ToolCallView | undefined {
      const files = (args as unknown as { files?: EmitFileArg[] })?.files
      if (!Array.isArray(files) || files.length === 0) return undefined
      return {
        card: 'generic',
        kind: 'edit',
        title: 'voltmind_emit（产物登记）',
        rawInput: files.length,
        locations: files.map((f) => ({ path: String(f.path) })),
      }
    },
    async execute(args, exec) {
      // 产物工作区：优先调用者的 agent 会话 cwd（工具在哪个会话被调用，产物就落哪个会话的工作区）；
      // 无 agent（如无会话上下文的调用）时回退注入的 resolveWorkspace。
      const agentCwd = exec?.agent?.session?.header?.cwd
      const wd = agentCwd !== undefined && agentCwd !== '' ? agentCwd : resolveWorkspace()
      const wdRoot = resolve(wd)
      const files = ((args as unknown as { files?: EmitFileArg[] })?.files ?? []) as EmitFileArg[]
      if (files.length === 0) throw new Error('voltmind_emit: files 不能为空（至少登记一个产物）')

      const registered: RegisteredArtifact[] = []
      for (const f of files) {
        const rel = String(f.path ?? '').trim()
        if (!rel) throw new Error('voltmind_emit: path 不能为空')
        if (rel.includes('\0')) throw new Error(`voltmind_emit: 非法的 path（含空字节）: ${rel}`)
        const abs = resolve(wdRoot, rel)
        // 边界校验：解析结果必须仍位于工作区内（防目录穿越登记工作区外文件）
        if (!(abs === wdRoot || abs.startsWith(wdRoot + sep))) {
          throw new Error(`voltmind_emit: path 越出工作区，拒绝登记: ${rel}`)
        }
        if (!existsSync(abs)) {
          throw new Error(`voltmind_emit: 文件不存在，拒绝登记: ${rel}`)
        }
        registered.push({ path: rel, abs, title: f.title ?? basename(abs), kind: f.kind ?? '' })
      }
      return { registered } as never
    },
  })
}
