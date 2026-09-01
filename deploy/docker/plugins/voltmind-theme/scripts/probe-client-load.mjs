// 模拟 dsh __ModuleLoader__ 加载 lib/client.js，验证 factory 加载期不抛错/不挂起。
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

let factory = null
const sandbox = { window: { __ModuleLoader__: { load(entry) { factory = entry.factory } } } }
sandbox.window.window = sandbox.window
vm.createContext(sandbox)
vm.runInContext(code, sandbox)

if (!factory) {
  console.log('FAIL: no factory registered via __ModuleLoader__.load')
  process.exit(1)
}
console.log('factory registered OK (id loads)')

const stubRequire = (id) => {
  if (id === 'react' || id === 'react/jsx-runtime') {
    return { jsx: () => null, jsxs: () => null, Fragment: null, useState: () => [null, () => {}] }
  }
  if (id.startsWith('@deepseek-ai/')) return {}
  throw new Error('unexpected require: ' + id)
}

const timer = setTimeout(() => {
  console.log('FAIL: factory HUNG (never returned)')
  process.exit(1)
}, 5000)

try {
  const mod = factory(stubRequire)
  clearTimeout(timer)
  console.log('factory executed OK; exports =', Object.keys(mod || {}).join(', ') || '(empty)')
  console.log('inject =', JSON.stringify(mod.inject))
} catch (e) {
  clearTimeout(timer)
  console.log('FACTORY THREW:', e.message)
  process.exit(1)
}
