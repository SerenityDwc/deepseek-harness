// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  BRAND_TITLE, WELCOME_TEXT, BADGE_SYMBOL,
  CSS_VAR_LOGO, CSS_VAR_ICON, DIALOG_ICON_H, LOGO_FLAG,
  injectBrandStyle, replaceFavicon, replaceTitle, replaceWelcomeText,
  findBrandContainers, replaceBrandContainer, isReplaced, setBrandTheme, mountBrand, getBrandTheme,
} from './brand.ts'
import { ASSETS } from './assets.ts'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  vi.restoreAllMocks()
})

describe('replaceFavicon', () => {
  it('清掉其他 icon link，注入当前主题 SVG data URI', () => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/a.png">'
    setBrandTheme('orange')
    replaceFavicon()
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
    expect(links.length).toBe(1)
    expect(links[0].href).toBe(ASSETS.orange.icon)
    expect(links[0].type).toBe('image/svg+xml')
  })

  it('切换主题更新 favicon', () => {
    setBrandTheme('blue')
    replaceFavicon()
    expect(document.querySelector<HTMLLinkElement>('link[data-voltmind-theme="favicon"]')!.href).toBe(ASSETS.blue.icon)
  })
})

describe('replaceTitle', () => {
  it('强制覆盖为 voltclaw AI harness（含 DSH 前缀场景）', () => {
    document.head.innerHTML = '<title>DeepSeek Harness voltclaw AI harness</title>'
    replaceTitle()
    expect(document.title).toBe(BRAND_TITLE)
    expect(document.querySelector('title')!.textContent).toBe(BRAND_TITLE)
  })
})

describe('replaceWelcomeText', () => {
  it('把含「探索/未至」的文字就地替换为欢迎语（数据驱动研发创新）', () => {
    document.body.innerHTML = '<div class="welcome"><p>探索未至之境预览版</p></div>'
    expect(replaceWelcomeText()).toBe(1)
    expect(document.querySelector('p')!.textContent).toBe('数据驱动研发创新')
    expect(document.querySelector('p')!.textContent).toBe(WELCOME_TEXT)
  })

  it('仅含「预览版」的角标小字换灯泡符号', () => {
    document.body.innerHTML =
      '<div class="welcome"><p>探索未至之境预览版</p><span class="badge">预览版</span></div>'
    replaceWelcomeText()
    expect(document.querySelector('p')!.textContent).toBe(WELCOME_TEXT)
    expect(document.querySelector('span.badge')!.textContent).toBe(BADGE_SYMBOL)
  })

  it('幂等：重复调用不再替换', () => {
    document.body.innerHTML = '<div><span>探索未至之境预览版</span></div>'
    replaceWelcomeText()
    replaceWelcomeText()
    expect(document.querySelector('span')!.textContent).toBe(WELCOME_TEXT)
  })

  it('不含目标文字的元素不动', () => {
    document.body.innerHTML = '<p>纯文本测试</p>'
    expect(replaceWelcomeText()).toBe(0)
    expect(document.querySelector('p')!.textContent).toBe('纯文本测试')
  })
})

describe('findBrandContainers（仅新建会话 Hero）', () => {
  it('选 class 含 fish 且非 railFish 的 svg', () => {
    document.body.innerHTML = '<div class="welcome"><svg class="hero fish"></svg></div>'
    const found = findBrandContainers()
    expect(found.length).toBe(1)
    expect(found[0].tagName.toLowerCase()).toBe('svg')
  })

  it('不选 railFish（侧边栏由 CSS 处理）', () => {
    document.body.innerHTML = '<div class="logoRow"><svg class="railFish"></svg></div>'
    expect(findBrandContainers().length).toBe(0)
  })

  it('不误伤普通 svg', () => {
    document.body.innerHTML = '<div class="chat"><svg class="icon"/></div>'
    expect(findBrandContainers().length).toBe(0)
  })
})

describe('replaceBrandContainer（Hero 叠加）', () => {
  it('svg 保留，插入方形图标 img（icon 标记）', () => {
    setBrandTheme('orange')
    document.body.innerHTML = '<div class="welcome"><div class="hero"><svg class="fish"/></div></div>'
    const svg = document.querySelector<HTMLElement>('svg.fish')!
    expect(replaceBrandContainer(svg, DIALOG_ICON_H, true)).toBe(true)
    expect(document.querySelector('svg.fish')).not.toBeNull()
    const img = document.querySelector<HTMLImageElement>('img[data-voltmind-theme="icon"]')!
    expect(img.src).toBe(ASSETS.orange.icon)
    expect(img.style.height).toBe(`${DIALOG_ICON_H}px`)
  })

  it('已替换的元素幂等', () => {
    setBrandTheme('orange')
    document.body.innerHTML = '<div class="welcome"><svg class="fish"/></div>'
    const svg = document.querySelector<HTMLElement>('svg')!
    replaceBrandContainer(svg, DIALOG_ICON_H, true)
    replaceBrandContainer(svg, DIALOG_ICON_H, true)
    expect(document.querySelectorAll('img[data-voltmind-theme]').length).toBe(1)
  })
})

describe('injectBrandStyle（侧边栏纯 CSS，:has() 条件兜底）', () => {
  it('规则包含宽态按钮背景 / 收起态 toggle 图标 / 原生 svg 隐藏', () => {
    injectBrandStyle()
    const style = document.querySelector<HTMLStyleElement>('style[data-voltmind-theme="brand"]')!
    const css = style.textContent ?? ''
    expect(css).toContain(`[class*="logoRow"] [class*="brand"]:not(:has(img[${LOGO_FLAG}])) { background: var(${CSS_VAR_LOGO})`)
    expect(css).toContain('min-height: 44px')
    expect(css).toContain(`[class*="collapsed"] [class*="toggle"]:not(:has(img[${LOGO_FLAG}])) { background: var(${CSS_VAR_ICON})`)
    expect(css).toContain('[class*="collapsed"] [class*="toggle"]:not(:has(img[data-voltmind-theme])):hover { background-image: none; }')
    expect(css).toContain('[class*="collapsed"] svg[class*="railFish"]')
    expect(css).toContain('svg[class*="fish"]:not([class*="railFish"])')
  })
})

describe('setBrandTheme', () => {
  it('更新 CSS 变量 + favicon + 已注入 img 的 src', () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.svg">'
    document.body.innerHTML = '<div class="welcome"><img data-voltmind-theme="icon" src="old"></div>'
    setBrandTheme('orange')
    expect(getBrandTheme()).toBe('orange')
    expect(document.body.style.getPropertyValue(CSS_VAR_LOGO)).toContain(ASSETS.orange.logo)
    expect(document.body.style.getPropertyValue(CSS_VAR_ICON)).toContain(ASSETS.orange.icon)
    expect(document.querySelector<HTMLImageElement>('img[data-voltmind-theme="icon"]')!.src).toBe(ASSETS.orange.icon)
    setBrandTheme('blue')
    expect(document.body.style.getPropertyValue(CSS_VAR_LOGO)).toContain(ASSETS.blue.logo)
    expect(document.body.style.getPropertyValue(CSS_VAR_ICON)).toContain(ASSETS.blue.icon)
    expect(document.querySelector<HTMLImageElement>('img[data-voltmind-theme="icon"]')!.src).toBe(ASSETS.blue.icon)
    expect(document.querySelector<HTMLLinkElement>('link[data-voltmind-theme="favicon"]')!.href).toBe(ASSETS.blue.icon)
  })
})

describe('mountBrand', () => {
  it('挂载：标题/favicon/欢迎语/CSS 变量 + Hero 图标注入', () => {
    document.head.innerHTML = '<title>DeepSeek Harness</title><link rel="icon" href="/favicon.svg">'
    document.body.innerHTML =
      '<div class="logoRow"><button class="brand"><svg class="wordmark"/></button><button class="toggle"></button></div>' +
      '<div class="welcome"><p>探索未至之境预览版</p><svg class="hero fish"/></div>'
    const dispose = mountBrand('orange')
    expect(document.title).toBe(BRAND_TITLE)
    expect(document.querySelector<HTMLLinkElement>('link[data-voltmind-theme="favicon"]')!.href).toBe(ASSETS.orange.icon)
    expect(document.querySelector('.welcome p')!.textContent).toBe(WELCOME_TEXT)
    expect(document.body.style.getPropertyValue(CSS_VAR_LOGO)).toContain(ASSETS.orange.logo)
    expect(document.querySelector('.welcome img[data-voltmind-theme="icon"]')).not.toBeNull()
    expect(document.querySelector('button.toggle')).not.toBeNull()
    dispose()
  })

  it('isReplaced 识别已注入元素', () => {
    document.body.innerHTML = '<div class="welcome"><svg data-voltmind-theme="icon"/></div>'
    expect(isReplaced(document.querySelector('svg')!)).toBe(true)
  })
})
