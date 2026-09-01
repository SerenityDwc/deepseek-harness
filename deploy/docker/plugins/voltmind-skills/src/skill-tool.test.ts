import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadSkillTool, skillTool, defaultRunner, type ScriptRunner } from './skill-tool.ts'

const hereDir = dirname(fileURLToPath(import.meta.url))
const hasPython = spawnSync('python', ['--version'], { encoding: 'utf8' }).status === 0

describe('loadSkillTool', () => {
  it('技能目录含 tool.json + script.py 时返回 meta 与 scriptPath', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-tool-'))
    try {
      const skillDir = join(root, 'myskill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'tool.json'), JSON.stringify({ name: 'x_tool', description: 'd', parameters: {} }))
      writeFileSync(join(skillDir, 'script.py'), 'print("ok")')
      const meta = loadSkillTool(root, 'myskill')
      expect(meta).not.toBeUndefined()
      expect(meta!.name).toBe('x_tool')
      expect(meta!.scriptPath).toBe(join(skillDir, 'script.py'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('缺 script.py 时返回 undefined', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-tool-'))
    try {
      const skillDir = join(root, 'myskill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'tool.json'), JSON.stringify({ name: 'x', description: 'd', parameters: {} }))
      expect(loadSkillTool(root, 'myskill')).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('缺 tool.json 时返回 undefined', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-tool-'))
    try {
      const skillDir = join(root, 'myskill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'script.py'), 'x')
      expect(loadSkillTool(root, 'myskill')).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('skillTool', () => {
  it('注册形状：name 与参数 schema、execute 走 runner', async () => {
    const stubRunner: ScriptRunner = (_script, args) => ({
      ok: true,
      stdout: JSON.stringify({ echoed: args }),
      stderr: '',
    })
    const tool = skillTool('voltcell', {
      name: 'voltmind_design',
      description: 'd',
      parameters: { a: { type: 'number' } },
      scriptPath: '/tmp/x.py',
    }, stubRunner)
    expect(tool.name).toBe('voltmind_design')
    expect((tool.parameters as { properties?: Record<string, unknown> }).properties).toHaveProperty('a')
    const exec = tool as unknown as { execute(a: unknown): Promise<unknown> }
    const out = await exec.execute({ a: 1 })
    expect(out).toEqual({ echoed: JSON.stringify({ a: 1 }) })
  })

  it('runner 失败抛错', async () => {
    const failing: ScriptRunner = () => ({ ok: false, stdout: '', stderr: 'boom' })
    const tool = skillTool('voltcell', {
      name: 't', description: 'd', parameters: {}, scriptPath: '/tmp/x.py',
    }, failing)
    const exec = tool as unknown as { execute(a: unknown): Promise<unknown> }
    await expect(exec.execute({})).rejects.toThrow(/boom/)
  })
})

describe('defaultRunner（真实 python，无则跳过）', () => {
  it.skipIf(!hasPython)('运行 voltcell v5 script.py 并解析结果（内置基准）', () => {
    const skillsRoot = join(hereDir, '..', 'skills')
    const meta = loadSkillTool(skillsRoot, 'voltcell')!
    const r = defaultRunner(meta.scriptPath, JSON.stringify({ capacityAh: 80, chemistry: 'LFP', formFactor: 'pouch' }))
    expect(r.ok).toBe(true)
    const out = JSON.parse(r.stdout)
    expect(out.design_capacity_Ah).toBeGreaterThan(80) // 目标 + 余量
    expect(out.energy_Wh).toBeGreaterThan(250)
    expect(out.source).toBe('builtin')
    expect(out.detail).toBeDefined()
  })

  it.skipIf(!hasPython)('knowledge_params 覆盖内置基准并标记 source=knowledge', () => {
    const skillsRoot = join(hereDir, '..', 'skills')
    const meta = loadSkillTool(skillsRoot, 'voltcell')!
    // 知识库值：NMC 电压 3.7、循环 1200（v5 不再用 density 覆盖能量密度——重量由工程计算）
    const r = defaultRunner(meta.scriptPath, JSON.stringify({
      capacityAh: 100, chemistry: 'NMC', formFactor: 'pouch',
      knowledge_params: { voltage: 3.7, cycle: 1200 },
    }))
    expect(r.ok).toBe(true)
    const out = JSON.parse(r.stdout)
    expect(out.source).toBe('knowledge')
    expect(out.nominal_voltage_V).toBe(3.7)
    expect(out.cycle_life).toBe(1200)
    expect(out.energy_Wh).toBeGreaterThan(370) // 100*1.0326*3.7
  })

  it.skipIf(!hasPython)('knowledge_params 缺省时回退内置基准', () => {
    const skillsRoot = join(hereDir, '..', 'skills')
    const meta = loadSkillTool(skillsRoot, 'voltcell')!
    const r = defaultRunner(meta.scriptPath, JSON.stringify({ capacityAh: 80, chemistry: 'LFP', formFactor: 'pouch', knowledge_params: {} }))
    expect(r.ok).toBe(true)
    expect(JSON.parse(r.stdout).source).toBe('builtin')
  })

  it.skipIf(!hasPython)('工程输入（engineering）参与重量/密度计算', () => {
    const skillsRoot = join(hereDir, '..', 'skills')
    const meta = loadSkillTool(skillsRoot, 'voltcell')!
    const r = defaultRunner(meta.scriptPath, JSON.stringify({
      capacityAh: 80, chemistry: 'LFP', formFactor: 'pouch',
      engineering: {
        cathode: { cathode_capacity: 145, cathode_load: 385, cathode_formula_ratio: 0.955 },
        anode: { anode_capacity: 350, anode_formula_ratio: 0.957 },
        separator: { sep_density: 10.5 },
        electrolyte: { elec_margin: 1.71 },
      },
      targetDensityWhKg: 150,
      dimensions: { L: 268, W: 217, T: 12 },
    }))
    expect(r.ok).toBe(true)
    const out = JSON.parse(r.stdout)
    expect(out.weight_g).toBeGreaterThan(500)
    expect(out.target_check.density_met).not.toBeNull()
    expect(out.volumetric_density_Wh_L).toBeGreaterThan(0)
  })

  it.skipIf(!hasPython)('输出完整参数集（params41，11 节 + 来源标注）', () => {
    const skillsRoot = join(hereDir, '..', 'skills')
    const meta = loadSkillTool(skillsRoot, 'voltcell')!
    const r = defaultRunner(meta.scriptPath, JSON.stringify({
      capacityAh: 80, chemistry: 'LFP', formFactor: 'pouch',
      engineering: { cathode: { cathode_capacity: 145 } },
    }))
    expect(r.ok).toBe(true)
    const out = JSON.parse(r.stdout)
    const sections = out.params41.sections
    expect(sections.length).toBe(11) // 11 节
    const total = sections.reduce((n, s) => n + s.items.length, 0)
    expect(total).toBeGreaterThanOrEqual(41) // 完整参数集（≥41，含箔材/Tab 明细）
    // 用户覆盖的来源标注
    const cathode = sections[1] // 正极片
    const capItem = cathode.items.find((it: any) => it.key === 'cathode_capacity')
    expect(capItem.source).toBe('user')
    // 默认项（箔材/Tab 用 80Ah 实测默认）
    const tabItem = cathode.items.find((it: any) => it.key === 'cathode_tab_W')
    expect(tabItem).toBeDefined()
    expect(tabItem.source).toBe('default')
    expect(tabItem.value).toBe(44)
  })
})
