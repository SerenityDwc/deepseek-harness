/**
 * 品牌 token 覆盖集：每个 token 必须给 { light, dark } 双值（平台 overrideTokens 强校验）。
 * 只动 alias 点缀层，不碰 --dsw-static-* / bg / label 大面。
 * 强度：整体比原生明显（用户反馈初版太克制/太浅）——深色系加深、点缀与分割线 alpha 提高。
 * 初值以品牌主色 #FA6A32 / #5891CD 派生，联调可微调。
 */

import type { ThemeId } from './param.ts'

export type ThemeTokenModes = { light: string; dark: string }
export type ThemeTokenOverrides = Record<string, ThemeTokenModes>

const ORANGE = '#FA6A32'
const ORANGE_STRONG = '#FF8A50'
const BLUE = '#5891CD'

/** 橙主题：品牌点缀 + 品牌色分割线（加强版）。 */
export const ORANGE_TOKENS: ThemeTokenOverrides = {
  // 品牌主色：链接/激活/图标
  '--dsw-alias-brand-primary': { light: ORANGE, dark: ORANGE_STRONG },
  // 新会话按钮底色（呼应）
  '--dsw-alias-button-elevated-fill': { light: '#FFE3D1', dark: '#4A2C1C' },
  // 新会话/悬浮控件悬停
  '--dsw-alias-button-floating-hover': { light: '#FFD6BC', dark: '#5A3723' },
  // 主按钮/发送
  '--dsw-alias-button-primary-fill': { light: ORANGE, dark: '#FF7F4D' },
  '--dsw-alias-button-primary-hover': { light: '#E2591F', dark: '#FF9468' },
  '--dsw-alias-button-primary-dimmed': { light: '#FFD2B8', dark: '#5A3826' },
  // 会话内业务点缀
  '--dsw-alias-state-business-primary': { light: ORANGE, dark: ORANGE_STRONG },
  '--dsw-alias-state-business-tertiary': { light: '#FFE3D1', dark: '#6B3D26' },
  // 侧边栏激活项 / 强调悬停（品牌色透明底，加强）
  '--dsw-specific-sidebar-nav-item-active': { light: 'rgba(250,106,50,0.20)', dark: 'rgba(255,138,80,0.26)' },
  '--dsw-specific-sidebar-nav-item-active-accent': { light: 'rgba(250,106,50,0.28)', dark: 'rgba(255,138,80,0.34)' },
  // 会话列表选中/悬停底色（ui-workspace 用 interactive-bg-hover）
  '--dsw-alias-interactive-bg-hover': { light: 'rgba(250,106,50,0.12)', dark: 'rgba(255,138,80,0.18)' },
  '--dsw-alias-interactive-bg-hover-accent': { light: 'rgba(250,106,50,0.18)', dark: 'rgba(255,138,80,0.26)' },
  '--dsw-alias-interactive-bg-active': { light: 'rgba(250,106,50,0.22)', dark: 'rgba(255,138,80,0.30)' },
  // 边栏分割线：品牌色浅染（加强）
  '--dsw-alias-border-l1': { light: 'rgba(250,106,50,0.16)', dark: 'rgba(255,138,80,0.20)' },
  '--dsw-alias-border-l2': { light: 'rgba(250,106,50,0.26)', dark: 'rgba(255,138,80,0.32)' },
  '--dsw-alias-border-l2-darkmode-thin': { light: 'rgba(250,106,50,0.26)', dark: 'rgba(255,138,80,0.18)' },
}

/** 蓝主题：品牌点缀 + 品牌色分割线（加强版；蓝色偏浅，alpha/tint 比橙更重）。 */
export const BLUE_TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-brand-primary': { light: BLUE, dark: '#67A0DB' },
  '--dsw-alias-button-elevated-fill': { light: '#D2E7FA', dark: '#1E3352' },
  '--dsw-alias-button-floating-hover': { light: '#BED9F6', dark: '#2A4E78' },
  '--dsw-alias-button-primary-fill': { light: BLUE, dark: '#66A0DA' },
  '--dsw-alias-button-primary-hover': { light: '#4A82C2', dark: '#7FB0E0' },
  '--dsw-alias-button-primary-dimmed': { light: '#BFD9F4', dark: '#27405E' },
  '--dsw-alias-state-business-primary': { light: BLUE, dark: '#67A0DB' },
  '--dsw-alias-state-business-tertiary': { light: '#D2E7FA', dark: '#2A4A70' },
  '--dsw-specific-sidebar-nav-item-active': { light: 'rgba(88,145,205,0.26)', dark: 'rgba(111,163,216,0.32)' },
  '--dsw-specific-sidebar-nav-item-active-accent': { light: 'rgba(88,145,205,0.34)', dark: 'rgba(111,163,216,0.40)' },
  // 会话列表选中/悬停底色（ui-workspace 用 interactive-bg-hover）
  '--dsw-alias-interactive-bg-hover': { light: 'rgba(88,145,205,0.14)', dark: 'rgba(111,163,216,0.20)' },
  '--dsw-alias-interactive-bg-hover-accent': { light: 'rgba(88,145,205,0.24)', dark: 'rgba(111,163,216,0.32)' },
  '--dsw-alias-interactive-bg-active': { light: 'rgba(88,145,205,0.28)', dark: 'rgba(111,163,216,0.36)' },
  '--dsw-alias-border-l1': { light: 'rgba(88,145,205,0.22)', dark: 'rgba(111,163,216,0.26)' },
  '--dsw-alias-border-l2': { light: 'rgba(88,145,205,0.34)', dark: 'rgba(111,163,216,0.40)' },
  '--dsw-alias-border-l2-darkmode-thin': { light: 'rgba(88,145,205,0.34)', dark: 'rgba(111,163,216,0.24)' },
}

export const THEME_TOKENS: Record<ThemeId, ThemeTokenOverrides> = {
  orange: ORANGE_TOKENS,
  blue: BLUE_TOKENS,
}
