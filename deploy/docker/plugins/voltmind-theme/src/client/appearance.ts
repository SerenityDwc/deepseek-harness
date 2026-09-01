/**
 * 设置 → 外观 区的「品牌配色」行（settings.general.item 插槽，order 30）：
 * 橙/蓝两个 cube，点击即时切换主题（与 URL 参数共用 applyTheme），仅内存态。
 * 无 store seat —— 选中态用组件本地 state（react 由 loader 共享实例，hooks 安全）。
 */

import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { getCurrentTheme, runPreview } from './apply.ts'
import type { ThemeId } from './param.ts'

const NS = 'settings.brandTheme'
export const BRAND_ROW_ID = 'brand-theme'
export const BRAND_ROW_ORDER = 30

const zh = {
  'brand.title': '品牌配色',
  'brand.orange': '橙色',
  'brand.blue': '蓝色',
} as const
const en = {
  'brand.title': 'Brand theme',
  'brand.orange': 'Orange',
  'brand.blue': 'Blue',
} as const
type BrandKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.brandTheme': BrandKey
  }
}

const CUBES: Array<{ id: ThemeId; color: string }> = [
  { id: 'orange', color: '#FA6A32' },
  { id: 'blue', color: '#5891CD' },
]

/** 组件 props：locale 标准座 t + 无 owner/inject 面。 */
interface BrandThemeRowProps {
  t: (key: BrandKey, params?: Record<string, unknown>) => string
}

function BrandThemeRow({ t }: BrandThemeRowProps) {
  const [selected, setSelected] = useState<ThemeId>(getCurrentTheme())
  const row: Record<string, unknown> = {
    style: {
      borderBottom: '1px solid var(--dsw-alias-border-l2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '16px 0',
    },
    children: [
      jsx('div', {
        style: { color: 'var(--dsw-alias-label-primary)', fontSize: 14, lineHeight: '22px' },
        children: t('brand.title'),
      }),
      jsxs('div', {
        style: { display: 'flex', gap: 8, flexWrap: 'wrap' },
        children: CUBES.map((c) =>
          jsx('button', {
            type: 'button',
            'aria-pressed': selected === c.id,
            onClick: () => {
              setSelected(c.id)
              runPreview(c.id)
            },
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: selected === c.id
                ? '1px solid var(--dsw-alias-border-l2)'
                : '1px solid var(--dsw-alias-border-l1)',
              background: selected === c.id ? 'var(--dsw-alias-bg-module-platform)' : 'transparent',
              color: 'var(--dsw-alias-label-primary)',
              borderRadius: 16,
              padding: '10px 20px',
              fontSize: 14,
              lineHeight: '22px',
              cursor: 'pointer',
            },
            children: [
              jsx('span', {
                style: { width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' },
              }),
              c.id === 'orange' ? t('brand.orange') : t('brand.blue'),
            ],
          }),
        ),
      }),
    ],
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return jsxs('div', row) as unknown
}

/** 注册品牌配色行；返回 disposer。 */
export function registerBrandRow(ctx: ClientContext): () => void {
  ctx.effect(() => {
    // Untyped per-locale form: this dsh's LocaleNamespaceMap merge does not
    // include `settings.brandTheme` until a newer locale package ships.
    const dropZh = ctx.locale.register(NS, 'zh', { ...zh })
    const dropEn = ctx.locale.register(NS, 'en', { ...en })
    return () => {
      dropZh()
      dropEn()
    }
  }, 'voltmind-theme: dictionaries')
  return ctx.slots.inject('settings.general.item', () =>
    // 泛型组合 props 校验对第三方宽松处理（运行时插槽注册会 fail-loud 兜底）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx.slots.register as any)(
      {
        name: 'settings.general.item',
        id: BRAND_ROW_ID,
        order: BRAND_ROW_ORDER,
        locale: NS,
      },
      BrandThemeRow,
    ),
  )
}
