import * as settingStorage from '@/storage/settingStore.js'
import { ok, fail } from '../interfaces/serviceResult.js'

export class SettingServiceLocal {
  async getSetting(key) {
    try {
      const value = await settingStorage.getSetting(key)
      return ok(value)
    } catch (error) {
      return fail('SETTING_GET_ERROR', '获取设置失败', error.message)
    }
  }

  async setSetting(key, value, category = 'display') {
    try {
      await settingStorage.setSetting(key, value, category)
      return ok(null)
    } catch (error) {
      return fail('SETTING_SET_ERROR', '保存设置失败', error.message)
    }
  }

  async getSettingsByCategory(category) {
    try {
      const all = await settingStorage.getAllSettings()
      const result = {}
      for (const [key, value] of Object.entries(all)) {
        result[key] = value
      }
      return ok(result)
    } catch (error) {
      return fail('SETTING_GET_ERROR', '获取设置列表失败', error.message)
    }
  }

  async exportSettings() {
    try {
      const settings = await settingStorage.getAllSettings()
      return ok(settings)
    } catch (error) {
      return fail('SETTING_EXPORT_ERROR', '导出设置失败', error.message)
    }
  }

  async importSettings(settings) {
    try {
      if (typeof settings !== 'object' || settings === null) {
        return fail('SETTING_IMPORT_ERROR', '设置格式无效')
      }
      for (const [key, value] of Object.entries(settings)) {
        await settingStorage.setSetting(key, value)
      }
      return ok(null)
    } catch (error) {
      return fail('SETTING_IMPORT_ERROR', '导入设置失败', error.message)
    }
  }

  async resetAll() {
    try {
      await settingStorage.resetAllSettings()
      return ok(null)
    } catch (error) {
      return fail('SETTING_RESET_ERROR', '重置设置失败', error.message)
    }
  }
}
