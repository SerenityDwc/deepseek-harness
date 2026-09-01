/** URL 参数解析：?theme=orange|blue，缺失/未知回退默认。 */

export type ThemeId = 'orange' | 'blue'

export const THEME_IDS: readonly ThemeId[] = ['orange', 'blue']

export const DEFAULT_THEME: ThemeId = 'orange'

export const THEME_PARAM = 'theme'

export const UNKNOWN_WARN = (value: string): string =>
  `[voltmind-theme] unknown theme param "${value}", falling back to "${DEFAULT_THEME}"`

/**
 * 解析 location.search（或任意 query 串）里的 theme 参数。
 * @param search - 如 "?theme=blue" 或 "theme=blue"（URLSearchParams 容忍前导 ?）。
 * @returns 'orange' | 'blue'；未知值打 warn 并回退 DEFAULT_THEME；缺失回退 DEFAULT_THEME。
 */
export function parseThemeParam(search: string): ThemeId {
  const params = new URLSearchParams(search)
  const value = params.get(THEME_PARAM)
  if (value === 'orange' || value === 'blue') return value
  if (value !== null && value !== '') console.warn(UNKNOWN_WARN(value))
  return DEFAULT_THEME
}
