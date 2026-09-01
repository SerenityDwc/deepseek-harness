import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { makeEmitTool } from './emit-artifact.ts'

/** 拿一个临时工作区，内建文件，返回 {wd, files, cleanup} */
function fixture() {
  const wd = mkdtempSync(join(tmpdir(), 'vemit-'))
  const files = {
    md: join(wd, 'design.md'),
    xlsx: join(wd, 'report.xlsx'),
  }
  writeFileSync(files.md, '# design')
  writeFileSync(files.xlsx, '\u0050\u004b') // xlsx 魔数占位
  return { wd, files, cleanup: () => rmSync(wd, { recursive: true, force: true }) }
}

describe('voltmind_emit', () => {
  it('presentCall 返回 generic/edit + locations（供 DSH produced 识别）', () => {
    const tool = makeEmitTool(() => 'C:\\ws')
    const view = tool.presentCall?.({ files: [{ path: 'design.md' }, { path: 'a/report.xlsx' }] })
    expect(view).toEqual({
      card: 'generic',
      kind: 'edit',
      title: 'voltmind_emit（产物登记）',
      rawInput: 2,
      locations: [{ path: 'design.md' }, { path: 'a/report.xlsx' }],
    })
    // 空 files 不声明（返回 undefined，回落 generic）
    expect(tool.presentCall?.({ files: [] })).toBeUndefined()
  })

  it('execute 登记存在的文件并返回路径/title', async () => {
    const { wd, files, cleanup } = fixture()
    try {
      const tool = makeEmitTool(() => wd)
      const res = (await tool.execute?.({ files: [{ path: 'design.md', title: '方案' }] }, {} as never)) as {
        registered: Array<{ path: string; abs: string; title: string }>
      }
      expect(res.registered).toHaveLength(1)
      expect(res.registered[0].path).toBe('design.md')
      expect(res.registered[0].abs).toBe(files.md)
      expect(res.registered[0].title).toBe('方案')
      const _ = files.xlsx
    } finally {
      cleanup()
    }
  })

  it('execute 拒绝登记工作区之外的文件（目录穿越）', async () => {
    const { wd, cleanup } = fixture()
    try {
      const tool = makeEmitTool(() => wd)
      await expect(
        tool.execute?.({ files: [{ path: '..\\..\\secret.txt' }] }, {} as never),
      ).rejects.toThrow(/越出工作区/)
    } finally {
      cleanup()
    }
  })

  it('execute 拒绝登记不存在的文件', async () => {
    const { wd, cleanup } = fixture()
    try {
      const tool = makeEmitTool(() => wd)
      await expect(tool.execute?.({ files: [{ path: 'nope.md' }] }, {} as never)).rejects.toThrow(/文件不存在/)
    } finally {
      cleanup()
    }
  })

  it('execute 空 files 报错', async () => {
    const { wd, cleanup } = fixture()
    try {
      const tool = makeEmitTool(() => wd)
      await expect(tool.execute?.({ files: [] }, {} as never)).rejects.toThrow(/不能为空/)
    } finally {
      cleanup()
    }
  })

  it('execute 优先用 exec.agent 所属会话的 cwd 作为工作区（而非全局默认）', async () => {
    const { wd, cleanup } = fixture()
    // 构造一个 agent 会话 cwd 指向别处（模拟工具调用者的会话）
    const agentWs = mkdtempSync(join(tmpdir(), 'vemit-agent-'))
    try {
      writeFileSync(join(agentWs, 'design.md'), '# agent design')
      const tool = makeEmitTool(() => wd) // 注入的默认 = wd（旧行为）
      const exec = {
        agent: { session: { header: { cwd: agentWs } } },
      } as never
      const res = (await tool.execute?.({ files: [{ path: 'design.md' }] }, exec)) as {
        registered: Array<{ path: string; abs: string }>
      }
      // 必须落到 agent 会话的工作区，而不是注入的默认 wd
      expect(res.registered[0].abs).toBe(join(agentWs, 'design.md'))
    } finally {
      cleanup()
      rmSync(agentWs, { recursive: true, force: true })
    }
  })

  it('无 exec.agent 时回退注入的 resolveWorkspace', async () => {
    const { wd, files, cleanup } = fixture()
    try {
      const tool = makeEmitTool(() => wd)
      const res = (await tool.execute?.({ files: [{ path: 'design.md' }] }, {} as never)) as {
        registered: Array<{ path: string; abs: string }>
      }
      expect(res.registered[0].abs).toBe(files.md)
    } finally {
      cleanup()
    }
  })
})
