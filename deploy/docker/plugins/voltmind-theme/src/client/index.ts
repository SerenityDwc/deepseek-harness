/**
 * voltmind-theme 客户端入口：
 * 1. 解析 URL ?theme=orange|blue（默认 orange）→ applyTheme（token 覆盖 + 品牌资产）
 * 2. 挂载品牌块注入（MutationObserver 自愈）
 * 3. 注册设置「外观」品牌配色行（预览开关）
 *
 * 防启动死锁（曾因启动页无限 loading 被误判为插件问题）：
 * - inject 只声明 ['slots','locale']（与同仓 voltmind-upload 一致，已验证可用）；
 *   'theme' 服务**不声明进 inject**（activation gating 会让解析不到服务的 fiber
 *   永久挂起），改由 applyTheme 内 ctx.get('theme') 可选查找 + body 直写回退。
 * - apply 期间任何一步失败只 console.warn 降级，绝不阻断客户端启动。
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { parseThemeParam } from './param.ts'
import { applyTheme, disposeTheme, setApplyRunner } from './apply.ts'
import { mountBrand } from './brand.ts'
import { registerBrandRow } from './appearance.ts'
import { registerBrandSlots } from './brand-slots.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  const theme = parseThemeParam(typeof window !== 'undefined' ? window.location.search : '')

  ctx.effect(() => {
    let disposeBrand: (() => void) | undefined
    try {
      applyTheme(ctx, theme)
      setApplyRunner((id) => applyTheme(ctx, id))
      disposeBrand = mountBrand(theme)
    } catch (error) {
      console.warn('[voltmind-theme] apply degraded (non-fatal):', error)
    }
    return () => {
      try { disposeBrand?.() } catch { /* noop */ }
      disposeTheme()
    }
  }, 'voltmind-theme: theme + brand')

  ctx.effect(() => {
    try {
      return registerBrandSlots(ctx)
    } catch (error) {
      console.warn('[voltmind-theme] brand slots skipped (non-fatal):', error)
      return () => {}
    }
  }, 'voltmind-theme: brand slots')

  ctx.effect(() => {
    try {
      return registerBrandRow(ctx)
    } catch (error) {
      console.warn('[voltmind-theme] settings row skipped (non-fatal):', error)
      return () => {}
    }
  }, 'voltmind-theme: settings row')
}
