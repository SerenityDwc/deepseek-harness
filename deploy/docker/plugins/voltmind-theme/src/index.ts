import type { Context } from '@deepseek-ai/cordis'

/**
 * voltmind-theme 服务端最小入口：无路由（品牌资产内联为 data URI），
 * 全部能力在客户端 bundle（lib/client.js）。保留 server 入口以符合
 * profile 的 bundle patch 装配形态（与同仓 voltmind-upload/brand 一致）。
 */
export const name = 'voltmind-theme'

export function apply(ctx: Context): void {
  ctx.effect(() => {
    ctx.logger.info('[voltmind-theme] client-only plugin (assets inlined as data URIs)')
    return () => {}
  }, 'voltmind-theme: no-op server entry')
}
