import { describe, it, expect } from 'vitest'
import { ASSETS, ORANGE_ICON, ORANGE_LOGO, BLUE_ICON, BLUE_LOGO } from './assets.ts'

describe('brand assets (data URIs)', () => {
  it('四个资产均为良构的 svg data URI', () => {
    for (const uri of [ORANGE_ICON, ORANGE_LOGO, BLUE_ICON, BLUE_LOGO]) {
      expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
      const svg = Buffer.from(uri.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8')
      expect(svg.trim().startsWith('<svg')).toBe(true)
    }
  })

  it('橙资产内含橙主题色、蓝资产内含蓝主题色', () => {
    const dec = (uri: string) => Buffer.from(uri.split(',')[1], 'base64').toString('utf8').toLowerCase()
    expect(dec(ORANGE_ICON)).toContain('#fa6a32')
    expect(dec(ORANGE_LOGO)).toContain('#fa6a32')
    expect(dec(BLUE_ICON)).toContain('#5891cd')
    expect(dec(BLUE_LOGO)).toContain('#5891cd')
  })

  it('ASSETS 按主题分组提供 icon/logo', () => {
    expect(ASSETS.orange.icon).toBe(ORANGE_ICON)
    expect(ASSETS.orange.logo).toBe(ORANGE_LOGO)
    expect(ASSETS.blue.icon).toBe(BLUE_ICON)
    expect(ASSETS.blue.logo).toBe(BLUE_LOGO)
  })
})
