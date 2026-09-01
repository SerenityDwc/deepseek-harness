/**
 * voltmind-theme 品牌块：favicon / 页面标题 / 左上角品牌行 / 新建会话视图品牌块 / 欢迎语文字。
 *
 * 注入策略：
 * - 侧边栏（宽态品牌按钮 + 收起态 rail）**纯 CSS**：注入 CSS 规则 + CSS 变量
 *   （--vt-logo / --vt-icon）显示品牌图、隐藏原生品牌 svg。React 重渲染重建
 *   元素不重置 CSS 规则与 body 上的 CSS 变量 → 永不闪烁/空白/鲸鱼重现。
 * - 新建会话 Hero 鱼形图标：CSS 隐藏原生 svg + 追加 img（该视图重渲染频率低）。
 * - 绝不 remove/replace React 管理节点（避免协调崩溃）。
 *
 * 品牌位（平台源码核对）：
 * 1) 宽态左上角品牌按钮（logoRow 内 brand 类）→ 横版 Logo（CSS 背景）
 * 2) 收起态 rail 鱼形图标（logoRow 直接子级 svg）→ 方形图标（CSS 背景）
 * 3) 新建会话 Hero 鱼形图标（class 含 fish 的非 railFish svg）→ 方形图标 44px
 */

import { ASSETS, type ThemeAssets } from './assets.ts'
import type { ThemeId } from './param.ts'

export const BRAND_TITLE = 'voltclaw AI harness'
export const WELCOME_TEXT = '数据驱动研发创新'
export const LOGO_ALT = 'VoltClaw'

/** 新建会话视图图标高度（px）。 */
export const DIALOG_ICON_H = 44

/** 品牌图标记（仅新建会话 Hero 的 img 需要；侧边栏走 CSS 不需要标记）。 */
export const LOGO_FLAG = 'data-voltmind-theme'
const LOGO_FLAG_VAL = 'logo'
const ICON_FLAG_VAL = 'icon'
const TEXT_FLAG = 'data-voltmind-theme'
const TEXT_FLAG_VAL = 'welcome'

/** CSS 变量名（body 上，随主题切换更新）。 */
export const CSS_VAR_LOGO = '--vt-logo'
export const CSS_VAR_ICON = '--vt-icon'

/** 新建会话 Hero 鱼形图标选择器（排除 rail 态 railFish，后者由 CSS 处理）。 */
const HERO_SELECTOR = 'svg[class*="fish"]:not([class*="railFish"])'

/** 原生主欢迎语识别（含「探索/未至」——角标小字只含「预览版」时单独处理）。 */
const NATIVE_WELCOME_RE = /探索|未至/
/** 角标小字识别（如「预览版」，不含主欢迎语特征 → 换灯泡符号）。 */
const BADGE_RE = /预览版/
/** 角标小字替换符号。 */
export const BADGE_SYMBOL = '💡'

/** 模块级当前主题。 */
let currentTheme: ThemeId = 'orange'

export function getBrandTheme(): ThemeId {
  return currentTheme
}

const isSvg = (el: Element): boolean => el.tagName.toLowerCase() === 'svg'

/** 一个元素是否已是我们注入的品牌元素。 */
export function isReplaced(container: Element): boolean {
  return container.getAttribute(LOGO_FLAG) === LOGO_FLAG_VAL ||
    container.getAttribute(LOGO_FLAG) === ICON_FLAG_VAL ||
    container.querySelector(`img[${LOGO_FLAG}], [${LOGO_FLAG}]`) !== null
}

/** 定位新建会话 Hero 鱼形图标（侧边栏由 CSS 处理，不进此列表）。 */
export function findBrandContainers(root: ParentNode = document): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const found: HTMLElement[] = []
  for (const el of Array.from(root.querySelectorAll(HERO_SELECTOR))) {
    if (!isReplaced(el)) found.push(el as HTMLElement)
  }
  return found
}

/** 叠加我们的图到新建会话 Hero 鱼形图标：隐藏原生 svg，插入 img 兄弟节点（不删除节点）。 */
export function replaceBrandContainer(container: HTMLElement, heightPx: number, icon: boolean): boolean {
  if (isReplaced(container)) return true
  const assets: ThemeAssets = ASSETS[currentTheme]
  const img = document.createElement('img')
  img.src = icon ? assets.icon : assets.logo
  img.alt = LOGO_ALT
  img.setAttribute(LOGO_FLAG, icon ? ICON_FLAG_VAL : LOGO_FLAG_VAL)
  img.style.cssText =
    `height:${heightPx}px;width:auto;max-width:100%;display:block;vertical-align:middle;`
  if (isSvg(container)) {
    container.setAttribute(LOGO_FLAG, icon ? ICON_FLAG_VAL : LOGO_FLAG_VAL)
    container.parentNode?.insertBefore(img, container)
  } else {
    container.insertBefore(img, container.firstChild)
  }
  return true
}

/** 就地替换原生欢迎语文字：主欢迎语（含「探索/未至」→ WELCOME_TEXT）与角标小字（仅「预览版」→ 💡），幂等。 */
export function replaceWelcomeText(root: ParentNode = document): number {
  if (typeof document === 'undefined') return 0
  let count = 0
  for (const el of Array.from(root.querySelectorAll('div, p, span, h1, h2, h3, h4, section, main, small'))) {
    if (el.getAttribute(TEXT_FLAG) !== null) continue
    if (el.querySelector('[data-voltmind-theme]')) continue
    let changed = false
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) continue
      const text = node.nodeValue ?? ''
      if (NATIVE_WELCOME_RE.test(text)) {
        node.nodeValue = WELCOME_TEXT
        changed = true
      } else if (BADGE_RE.test(text)) {
        node.nodeValue = BADGE_SYMBOL
        changed = true
      }
    }
    if (changed) {
      el.setAttribute(TEXT_FLAG, TEXT_FLAG_VAL)
      count += 1
    }
  }
  return count
}

/** 替换 favicon：清掉其他 icon link，注入当前主题 SVG data URI（每次调用强制覆盖）。 */
export function replaceFavicon(): void {
  if (typeof document === 'undefined') return
  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'))) {
    if (link.dataset.voltmindTheme !== 'favicon') link.remove()
  }
  let link = document.querySelector<HTMLLinkElement>('link[data-voltmind-theme="favicon"]')
  if (link === null) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.dataset.voltmindTheme = 'favicon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = ASSETS[currentTheme].icon
}

/** 页面标题：强制覆盖为 BRAND_TITLE（DSH 会话变化会重写 title，每次自愈拉回）。 */
export function replaceTitle(): void {
  if (typeof document === 'undefined') return
  if (document.title !== BRAND_TITLE) document.title = BRAND_TITLE
  const t = document.querySelector('title')
  if (t !== null && t.textContent !== BRAND_TITLE) t.textContent = BRAND_TITLE
}

/** 更新品牌 CSS 变量（侧边栏 Logo/图标走 CSS 背景，随主题切换即时生效）。 */
function updateCssVars(theme: ThemeId): void {
  if (typeof document === 'undefined' || !document.body) return
  const body = document.body
  body.style.setProperty(CSS_VAR_LOGO, `url("${ASSETS[theme].logo}")`)
  body.style.setProperty(CSS_VAR_ICON, `url("${ASSETS[theme].icon}")`)
}

/** 对当前 DOM 应用品牌（favicon + 标题 + 欢迎语 + Hero 图标注入兜底）。 */
function applyBrand(): void {
  replaceFavicon()
  replaceTitle()
  replaceWelcomeText()
  // Hero 鱼形图标兜底：新版由槽位接管（VoltClawBrandMark），旧版无槽位时注入 img
  for (const container of findBrandContainers()) {
    if (isReplaced(container)) continue
    replaceBrandContainer(container, DIALOG_ICON_H, true)
  }
}

/** 切换品牌主题：更新 CSS 变量 + favicon + 已注入 img 的 src。 */
export function setBrandTheme(theme: ThemeId): void {
  currentTheme = theme
  if (typeof document === 'undefined') return
  updateCssVars(theme)
  replaceFavicon()
  for (const img of Array.from(document.querySelectorAll<HTMLImageElement>(`img[${LOGO_FLAG}="${LOGO_FLAG_VAL}"], img[${LOGO_FLAG}="${ICON_FLAG_VAL}"]`))) {
    img.src = ASSETS[theme].icon
  }
  applyBrand()
}

/**
 * 挂载品牌注入（样式 + MutationObserver 自愈 + 轮询兜底），返回 disposer。
 * observer 500ms 节流：避免第三方（genui DOM 渲染通道）启动期海量变更导致 CPU 饥饿。
 */
const OBSERVER_MIN_INTERVAL_MS = 500

export function mountBrand(initial: ThemeId): () => void {
  if (typeof document === 'undefined') return () => {}
  currentTheme = initial
  injectBrandStyle()
  updateCssVars(initial)
  applyBrand()
  let lastRun = Date.now()
  const throttledApply = (): void => {
    const now = Date.now()
    if (now - lastRun < OBSERVER_MIN_INTERVAL_MS) return
    lastRun = now
    applyBrand()
  }
  const observer = new MutationObserver(throttledApply)
  observer.observe(document.body, { childList: true, subtree: true })
  const interval = setInterval(applyBrand, 3000)
  return () => { observer.disconnect(); clearInterval(interval) }
}

/**
 * 注入品牌样式（React 重建免疫）。
 *
 * 品牌图策略（兼容新/旧两版 dsh）：
 * - 新版（0.1.1-rc.2+，阿里云）：brand-slots.ts 通过官方槽位渲染 VoltClaw img，
 *   `:has()` 匹配到 img 时 CSS 背景规则自动跳过 → 不叠加。
 * - 旧版（0.1.0-rc.6，本地）：槽位未接管/未渲染 img，`:has()` 不匹配，
 *   CSS 背景规则兜底显示 VoltClaw logo/icon。
 * - 始终保留隐藏原生品牌 svg（官方 FishLogo / wordmark）的兜底规则。
 */
export function injectBrandStyle(): void {
  if (typeof document === 'undefined' || document.querySelector('style[data-voltmind-theme="brand"]')) return
  const style = document.createElement('style')
  style.dataset.voltmindTheme = 'brand'
  style.textContent = [
    // 宽态：品牌按钮显示横版 Logo（仅当无槽位 img 时兜底；保底高度防塌陷）
    `[class*="logoRow"] [class*="brand"]:not(:has(img[${LOGO_FLAG}])) { background: var(${CSS_VAR_LOGO}) left center / contain no-repeat; min-height: 44px; overflow: visible !important; }`,
    // 宽态：隐藏原生词标 svg
    '[class*="logoRow"] [class*="brand"] svg { opacity: 0 !important; pointer-events: none !important; }',
    // 宽态（槽位接管时）：展开态只显示长形词标（brandName），隐藏方形 mark（brandMark），
    // 与本地视觉一致（一个横版 Logo，而非方形+长形并排）
    `[class*="logoRow"] [class*="brandMark"] img[${LOGO_FLAG}="icon"] { display: none !important; }`,
    // 展开态长形词标放大：容器 brandIdentity/brandName 原高 24px 且 logoRow overflow:hidden，
    // 必须同步放大容器高度（44px ≈ 本地）否则 logo 被裁剪（"下面被遮蔽"）
    `[class*="logoRow"] [class*="brandIdentity"] { height: 44px !important; }`,
    `[class*="logoRow"] [class*="brandName"] { height: 44px !important; overflow: visible !important; }`,
    `[class*="logoRow"] [class*="brandName"] img[${LOGO_FLAG}="logo"] { height: 36px !important; }`,
    // 收起态：toggle 按钮显示方形图标（仅当无槽位 img 时兜底），隐藏鱼形 svg
    `[class*="collapsed"] [class*="toggle"]:not(:has(img[${LOGO_FLAG}])) { background: var(${CSS_VAR_ICON}) center / 22px auto no-repeat; }`,
    // 收起态悬停：隐藏品牌图标背景，让原生展开图标（panelIcon）独占显示（避免叠加）
    `[class*="collapsed"] [class*="toggle"]:not(:has(img[${LOGO_FLAG}])):hover { background-image: none; }`,
    '[class*="collapsed"] svg[class*="railFish"], [class*="collapsed"] [class*="railMark"] svg { opacity: 0 !important; pointer-events: none !important; }',
    // 新建会话 Hero 鱼形图标：隐藏（由槽位 img 或注入 img 显示）
    'svg[class*="fish"]:not([class*="railFish"]) { opacity: 0 !important; pointer-events: none !important; }',
  ].join('\n')
  document.head.appendChild(style)
}
