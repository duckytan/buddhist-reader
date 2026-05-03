import * as sutraStorage from '@/storage/sutraStore.js'
import { ok, fail } from '../interfaces/serviceResult.js'
import { sutraManifest, listSutras as listSutrasFromManifest } from '@/data/sutraManifest.js'

export class SutraServiceLocal {
  async listSutras(category = null) {
    try {
      const stored = await sutraStorage.listSutras(category)
      if (stored && stored.length > 0) {
        return ok(stored)
      }
      const manifest = listSutrasFromManifest(category)
      return ok(manifest)
    } catch (error) {
      return fail('SUTRA_LIST_ERROR', '获取经书列表失败', error.message)
    }
  }

  async getSutra(id) {
    try {
      const sutra = await sutraStorage.getSutra(id)
      if (sutra) return ok(sutra)
      return fail('SUTRA_NOT_FOUND', '经书不存在')
    } catch (error) {
      return fail('SUTRA_GET_ERROR', '获取经书失败', error.message)
    }
  }

  async getSutraBySlug(slug) {
    try {
      const sutra = await sutraStorage.getSutraBySlug(slug)
      if (sutra) return ok(sutra)
      return fail('SUTRA_NOT_FOUND', '经书不存在')
    } catch (error) {
      return fail('SUTRA_GET_ERROR', '获取经书失败', error.message)
    }
  }

  async importSutra(file) {
    try {
      const content = await file.text()
      const lines = content.split('\n').filter(line => line.trim())
      const sutra = {
        title: file.name.replace(/\.[^.]+$/, ''),
        slug: file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '-'),
        category: 'custom',
        translator: '未知',
        chapterCount: 1,
        totalChars: content.length,
        coverUrl: null
      }
      const id = await sutraStorage.addSutra(sutra)
      return ok({ id, ...sutra })
    } catch (error) {
      return fail('SUTRA_IMPORT_ERROR', '导入经书失败', error.message)
    }
  }
}
