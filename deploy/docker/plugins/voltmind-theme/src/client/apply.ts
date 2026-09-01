/**
 * applyTheme：URL 参数与设置面板预览共用的主题应用入口。
 *
 * 主题服务改为**可选**（ctx.get('theme')）：不把 'theme' 声明进 inject——
 * runner 的 activation gating 会在服务解析不到时让 fiber 永远挂起（启动死锁）。
 * - 平台 theme 服务可用：overrideTokens（同 source 替换层，明暗模式自动适配）
 * - 不可用：回退直接写 body 的 CSS 变量（DSH token 定义在 body，inline 声明可覆盖；
 *   注意不能写 :root——body 自身声明会覆盖继承值）
 */

import type { ThemeTokenOverrides } from './themes.ts'
import { THEME_TOKENS } from './themes.ts'
import type { ThemeId } from './param.ts'
import { setBrandTheme } from './brand.ts'

export const OVERRIDE_SOURCE = '@voltmind/dsh-theme'

/** applyTheme 只依赖的最小 ctx 面（结构类型，便于单测 stub；theme 可缺省）。 */
export interface ThemeRuntimeLike {
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void
}
export interface ApplyContext {
  /** 可选服务查找（不声明进 inject，避免激活挂起）。 */
  get?(name: string): unknown
  theme?: ThemeRuntimeLike
}

let current: ThemeId = 'orange'
let disposeLayer: (() => void) | undefined
let wroteBodyTokens = false
/** 设置面板预览的执行器：index.ts 注入绑定 ctx 的 applyTheme（组件内无 ctx）。 */
let previewRunner: ((id: ThemeId) => void) | undefined

export function getCurrentTheme(): ThemeId {
  return current
}

/** 绑定预览执行器（index.ts apply 时注入；可重复绑定覆盖）。 */
export function setApplyRunner(fn: (id: ThemeId) => void): void {
  previewRunner = fn
}

/** 设置面板品牌行点击入口：执行当前绑定的 applyTheme。 */
export function runPreview(id: ThemeId): void {
  previewRunner?.(id)
}

/** 解析主题服务：优先 ctx.get('theme') 可选查找；退而 ctx.theme（静态 ctx 直读）。 */
function resolveThemeService(ctx: ApplyContext): ThemeRuntimeLike | undefined {
  const viaGet = ctx.get?.('theme')
  if (viaGet && typeof (viaGet as ThemeRuntimeLike).overrideTokens === 'function') {
    return viaGet as ThemeRuntimeLike
  }
  if (ctx.theme && typeof ctx.theme.overrideTokens === 'function') return ctx.theme
  return undefined
}

/** 判断当前是否深色模式（DSH 用 body[data-ds-dark-theme]）。 */
function isDarkScheme(): boolean {
  if (typeof document === 'undefined') return false
  if (document.body && document.body.hasAttribute('data-ds-dark-theme')) return true
  if (typeof matchMedia !== 'undefined') return matchMedia('(prefers-color-scheme: dark)').matches
  return false
}

/** 回退路径：把 token 直接写到 body 的 inline 样式（覆盖样式表声明）。 */
function writeTokensToBody(tokens: ThemeTokenOverrides): void {
  if (typeof document === 'undefined' || !document.body) return
  const dark = isDarkScheme()
  const body = document.body
  for (const [prop, modes] of Object.entries(tokens)) {
    body.style.setProperty(prop, dark ? modes.dark : modes.light)
  }
  wroteBodyTokens = true
}

/** 应用主题：先换品牌资产，再叠加 token（平台 theme 服务优先，回退 body 直写）。 */
export function applyTheme(ctx: ApplyContext | undefined, theme: ThemeId): void {
  current = theme
  setBrandTheme(theme)
  disposeLayer?.()
  disposeLayer = undefined
  const service = resolveThemeService(ctx ?? {})
  if (service) {
    disposeLayer = service.overrideTokens(OVERRIDE_SOURCE, THEME_TOKENS[theme])
  } else {
    writeTokensToBody(THEME_TOKENS[theme])
  }
}

/** 卸载时释放当前覆盖层/清除 body 直写（幂等）。 */
export function disposeTheme(): void {
  disposeLayer?.()
  disposeLayer = undefined
  if (wroteBodyTokens && typeof document !== 'undefined' && document.body) {
    for (const prop of Object.keys(THEME_TOKENS[current])) {
      document.body.style.removeProperty(prop)
    }
    wroteBodyTokens = false
  }
}
