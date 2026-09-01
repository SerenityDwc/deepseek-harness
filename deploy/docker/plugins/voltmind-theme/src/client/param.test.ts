import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseThemeParam, DEFAULT_THEME, THEME_IDS } from './param.ts'

describe('parseThemeParam', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('解析 ?theme=orange', () => {
    expect(parseThemeParam('?theme=orange')).toBe('orange')
  })

  it('解析 ?theme=blue', () => {
    expect(parseThemeParam('?theme=blue')).toBe('blue')
  })

  it('缺失参数回退默认 orange', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseThemeParam('')).toBe(DEFAULT_THEME)
    expect(parseThemeParam('?foo=1')).toBe(DEFAULT_THEME)
    expect(warn).not.toHaveBeenCalled()
  })

  it('未知值回退默认并 warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseThemeParam('?theme=green')).toBe(DEFAULT_THEME)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('green'))
  })

  it('大小写敏感：THEME=ORANGE 视为未知', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseThemeParam('?THEME=ORANGE')).toBe(DEFAULT_THEME)
  })

  it('THEME_IDS 恰好是 orange/blue', () => {
    expect([...THEME_IDS].sort()).toEqual(['blue', 'orange'])
  })
})
