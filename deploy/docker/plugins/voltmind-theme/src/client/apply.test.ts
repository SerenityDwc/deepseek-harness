// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { applyTheme, disposeTheme, getCurrentTheme, OVERRIDE_SOURCE, setApplyRunner, runPreview } from './apply.ts'
import { ORANGE_TOKENS, BLUE_TOKENS } from './themes.ts'
import type { ThemeTokenOverrides } from './themes.ts'

interface StubTheme {
  overrideTokens: ReturnType<typeof vi.fn>
}

/** ctx 带可选 get('theme')，模拟平台 theme 服务可用。 */
function makeCtxWithTheme() {
  const theme = { overrideTokens: vi.fn(() => () => {}) }
  const ctx = { get: (name: string) => (name === 'theme' ? theme : undefined) }
  return { theme, ctx }
}

describe('applyTheme（theme 服务路径）', () => {
  afterEach(() => {
    disposeTheme()
    vi.restoreAllMocks()
  })

  it('orange：通过 ctx.get("theme") 走 overrideTokens', () => {
    const { theme, ctx } = makeCtxWithTheme()
    applyTheme(ctx, 'orange')
    expect(theme.overrideTokens).toHaveBeenCalledWith(OVERRIDE_SOURCE, ORANGE_TOKENS)
    expect(getCurrentTheme()).toBe('orange')
  })

  it('blue：overrideTokens 收到蓝 token 集', () => {
    const { theme, ctx } = makeCtxWithTheme()
    applyTheme(ctx, 'blue')
    expect(theme.overrideTokens).toHaveBeenCalledWith(OVERRIDE_SOURCE, BLUE_TOKENS)
    expect(getCurrentTheme()).toBe('blue')
  })

  it('重复调用：同 source 替换层', () => {
    const { theme, ctx } = makeCtxWithTheme()
    applyTheme(ctx, 'orange')
    applyTheme(ctx, 'blue')
    expect(theme.overrideTokens).toHaveBeenCalledTimes(2)
  })
})

describe('applyTheme（theme 服务缺失回退：body 直写）', () => {
  afterEach(() => {
    disposeTheme()
    document.body.removeAttribute('data-ds-dark-theme')
    vi.restoreAllMocks()
  })

  it('无 theme 服务：token 直写 body，浅色取 light 值', () => {
    applyTheme({}, 'orange')
    const val = document.body.style.getPropertyValue('--dsw-alias-brand-primary')
    expect(val).toBe(ORANGE_TOKENS['--dsw-alias-brand-primary'].light)
  })

  it('深色模式：body[data-ds-dark-theme] 时取 dark 值', () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    applyTheme({}, 'blue')
    const val = document.body.style.getPropertyValue('--dsw-alias-brand-primary')
    expect(val).toBe(BLUE_TOKENS['--dsw-alias-brand-primary'].dark)
  })

  it('disposeTheme 清除 body 直写的变量', () => {
    applyTheme({}, 'orange')
    expect(document.body.style.getPropertyValue('--dsw-alias-brand-primary')).toBeTruthy()
    disposeTheme()
    expect(document.body.style.getPropertyValue('--dsw-alias-brand-primary')).toBe('')
  })
})

describe('runPreview', () => {
  afterEach(() => {
    disposeTheme()
    vi.restoreAllMocks()
  })

  it('触发绑定执行器', () => {
    const fn = vi.fn()
    setApplyRunner(fn)
    runPreview('blue')
    expect(fn).toHaveBeenCalledWith('blue')
  })
})

describe('types sanity', () => {
  it('THEME_TOKENS 与 ThemeTokenOverrides 兼容', () => {
    const t: ThemeTokenOverrides = ORANGE_TOKENS
    expect(Object.keys(t).length).toBeGreaterThan(0)
  })
})
