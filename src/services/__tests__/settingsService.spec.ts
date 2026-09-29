import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_READER_SETTINGS,
  FONT_SIZE_STEPS,
  createSettingsService,
  sanitizeSettings
} from '@/services/settingsService'

describe('settingsService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('load：空存储返回默认值', () => {
    const service = createSettingsService()
    expect(service.load()).toEqual(DEFAULT_READER_SETTINGS)
  })

  it('save / load 往返', () => {
    const service = createSettingsService()
    expect(service.save({ fontSizeIndex: 5, lineHeightIndex: 1, theme: 'night' })).toBe(true)
    expect(service.load()).toEqual({ fontSizeIndex: 5, lineHeightIndex: 1, theme: 'night' })
  })

  it('sanitize：越界钳制 + 非法主题回退', () => {
    expect(sanitizeSettings({ fontSizeIndex: 99, lineHeightIndex: -3, theme: 'night' })).toEqual({
      fontSizeIndex: FONT_SIZE_STEPS - 1,
      lineHeightIndex: 0,
      theme: 'night'
    })
    // 非法主题（绕过类型）回退默认
    const bad = sanitizeSettings({ theme: 'rainbow' as never })
    expect(bad.theme).toBe('paper')
    expect(sanitizeSettings(null)).toEqual(DEFAULT_READER_SETTINGS)
  })

  it('reset：写回默认值', () => {
    const service = createSettingsService()
    service.save({ fontSizeIndex: 6, lineHeightIndex: 4, theme: 'day' })
    const reset = service.reset()
    expect(reset).toEqual(DEFAULT_READER_SETTINGS)
    expect(service.load()).toEqual(DEFAULT_READER_SETTINGS)
  })

  it('损坏存储 → 回退默认值', () => {
    localStorage.setItem('br-settings', '{not json')
    const service = createSettingsService()
    expect(service.load()).toEqual(DEFAULT_READER_SETTINGS)
  })
})
