import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * dsh client bundle 契约回归测试（load 前必须先 `pnpm -r build` 生成 lib/client.js）：
 * dsh web 的 client-modules 以 classic script 注入插件 client bundle，要求 bundle 自注册
 * `window.__ModuleLoader__.load({ id, factory })`。
 */
const here = dirname(fileURLToPath(import.meta.url))
const client = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

describe('client bundle contract (dsh client-modules)', () => {
  it('自注册 __ModuleLoader__.load 且 id 为包名', () => {
    expect(client).toContain('window.__ModuleLoader__.load({')
    expect(client).toContain('id: "@voltmind/dsh-theme"')
    expect(client).toContain('factory: (require) => {')
  })

  it('导出 inject/apply 且无裸 ESM export 残留', () => {
    expect(client).toContain('exports.apply = apply;')
    expect(client).toContain('exports.inject = inject;')
    expect(client).toContain('return module.exports;')
    expect(client).not.toMatch(/\nexport\s*\{[^}]*\};\s*$/)
  })

  it('平台模块走 require()（react / jsx-runtime），不内联', () => {
    expect(client).toMatch(/require\("react\/jsx-runtime"\)/)
    expect(client).toMatch(/require\("react"\)/)
    expect(client).not.toContain('node_modules/react')
  })
})
