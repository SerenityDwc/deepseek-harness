/**
 * voltmind-theme 品牌槽位接管：注册 sidebar.brand.mark / sidebar.brand.name /
 * conversation.hero.brand.mark，用 VoltClaw 图标替换官方鲸鱼（FishLogo）与空槽位
 * fallback。这是官方 slots 机制（同 dsh-client-ui-brand-official 的注册模式），
 * 不依赖脆弱 CSS 选择器，折叠/展开/hero 全态生效。
 *
 * 注意：profile.patch.yml 已禁用官方品牌（ui-brand-official disabled），
 * 本插件是品牌槽位的唯一注册者；若未来重新启用官方品牌，同名槽位会用
 * priority 影子规则（lowest renders）保证 VoltClaw 优先。
 */

import { jsx } from 'react/jsx-runtime'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// 引入 sidebar/conversation 的槽位声明（扩展 SlotMap，使 sidebar.brand.mark 等可注册）
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ASSETS, type ThemeAssets } from './assets.ts'
import { getBrandTheme, BRAND_TITLE, LOGO_FLAG } from './brand.ts'

/** 品牌 mark（图标）槽位组件 props：host 提供的 mark 呈现。 */
interface BrandMarkProps {
  size?: number
  className?: string
}

/** 品牌 name（词标）槽位组件 props。 */
interface BrandNameProps {
  className?: string
}

/** 取当前主题资产。 */
function assets(): ThemeAssets {
  return ASSETS[getBrandTheme()]
}

/**
 * 品牌图标 mark：用 VoltClaw 方形图标替换鲸鱼 FishLogo。
 * 以 <img> 渲染（data URI），宽高按 host 给的 size 等比缩放。
 */
export function VoltClawBrandMark({ size = 24, className }: BrandMarkProps) {
  return jsx('img', {
    src: assets().icon,
    alt: 'VoltClaw',
    className,
    // 带 VoltClaw 标记：CSS :has(img[data-voltmind-theme]) 识别后跳过背景兜底，
    // 避免槽位 img 与 CSS 背景叠加
    [LOGO_FLAG]: 'icon',
    style: {
      height: size,
      width: 'auto',
      maxWidth: '100%',
      display: 'block',
      verticalAlign: 'middle',
    },
  })
}

/** 品牌词标：用 VoltClaw 横版 Logo 替换官方 BrandWordmark（展开态显示，高度 28 与本地一致）。 */
export function VoltClawBrandName({ className }: BrandNameProps) {
  return jsx('img', {
    src: assets().logo,
    alt: BRAND_TITLE,
    className,
    [LOGO_FLAG]: 'logo',
    style: {
      height: 28,
      width: 'auto',
      maxWidth: '100%',
      display: 'block',
      verticalAlign: 'middle',
    },
  })
}

/**
 * 注册全部品牌槽位（幂等；插件生命周期内注册一次）。
 * @param ctx - client root context。
 */
export function registerBrandSlots(ctx: ClientContext): () => void {
  return ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, VoltClawBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, VoltClawBrandName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, VoltClawBrandMark)
      }),
    ),
  )
}
