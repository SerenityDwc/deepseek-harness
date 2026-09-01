import { describe, it, expect } from 'vitest'
import { ORANGE_TOKENS, BLUE_TOKENS, THEME_TOKENS } from './themes.ts'

const TOKEN_KEYS = [
  '--dsw-alias-brand-primary',
  '--dsw-alias-button-elevated-fill',
  '--dsw-alias-button-floating-hover',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-button-primary-hover',
  '--dsw-alias-button-primary-dimmed',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-state-business-tertiary',
  '--dsw-specific-sidebar-nav-item-active',
  '--dsw-specific-sidebar-nav-item-active-accent',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-interactive-bg-hover-accent',
  '--dsw-alias-interactive-bg-active',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-border-l2-darkmode-thin',
]

describe('themes token sets', () => {
  it('每个 token 都有 light+dark 且非空', () => {
    for (const set of [ORANGE_TOKENS, BLUE_TOKENS]) {
      for (const key of TOKEN_KEYS) {
        const modes = set[key]
        expect(modes, `missing ${key}`).toBeDefined()
        expect(modes.light, `${key}.light`).toBeTruthy()
        expect(modes.dark, `${key}.dark`).toBeTruthy()
      }
    }
  })

  it('品牌主色为指定色板', () => {
    expect(ORANGE_TOKENS['--dsw-alias-brand-primary'].light.toLowerCase()).toBe('#fa6a32')
    expect(BLUE_TOKENS['--dsw-alias-brand-primary'].light.toLowerCase()).toBe('#5891cd')
  })

  it('分割线 token 带品牌色浅染（含主题色分量）', () => {
    expect(ORANGE_TOKENS['--dsw-alias-border-l2'].light).toContain('250,106,50')
    expect(BLUE_TOKENS['--dsw-alias-border-l2'].light).toContain('88,145,205')
    expect(ORANGE_TOKENS['--dsw-alias-border-l2-darkmode-thin'].dark).toContain('255,138,80')
    expect(BLUE_TOKENS['--dsw-alias-border-l2-darkmode-thin'].dark).toContain('111,163,216')
  })

  it('THEME_TOKENS 覆盖 orange/blue 两套', () => {
    expect(Object.keys(THEME_TOKENS).sort()).toEqual(['blue', 'orange'])
    expect(THEME_TOKENS.orange).toBe(ORANGE_TOKENS)
    expect(THEME_TOKENS.blue).toBe(BLUE_TOKENS)
  })

  it('无多余 token 键（只覆盖点缀层，不碰 bg/label 大面）', () => {
    for (const set of [ORANGE_TOKENS, BLUE_TOKENS]) {
      expect(Object.keys(set).sort()).toEqual([...TOKEN_KEYS].sort())
    }
  })
})
