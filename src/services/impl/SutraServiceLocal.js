import * as sutraStorage from '@/storage/sutraStore.js'
import { initDB } from '@/storage/db.js'
import { ok, fail } from '../interfaces/serviceResult.js'
import { sutraManifest, listSutras as listSutrasFromManifest } from '@/data/sutraManifest.js'

let cachedSutras = null
let dbInitialized = false

async function ensureDB() {
  if (!dbInitialized) {
    try {
      await initDB()
      dbInitialized = true
    } catch (error) {
      console.warn('[SutraService] DB init failed, falling back to remote:', error)
    }
  }
}

async function loadRemoteSutras() {
  if (cachedSutras) return cachedSutras

  try {
    const response = await fetch('/sutras/manifest.json')
    if (!response.ok) throw new Error('Failed to load manifest')
    const manifest = await response.json()

    cachedSutras = manifest.map((item, index) => ({
      id: index + 1,
      title: item.title,
      slug: encodeURIComponent(item.filename.replace('.json', '')),
      filename: item.filename,
      author: item.author,
      category: item.category,
      chapterCount: item.chapterCount,
      totalChars: item.totalChars,
      description: item.description,
      coverUrl: null
    }))

    return cachedSutras
  } catch (error) {
    console.warn('[SutraService] Failed to load remote sutras, using manifest:', error)
    return listSutrasFromManifest()
  }
}

export class SutraServiceLocal {
  async listSutras(category = null) {
    try {
      await ensureDB()
      const stored = await sutraStorage.listSutras(category)
      if (stored && stored.length > 0) {
        return ok(stored)
      }

      const sutras = await loadRemoteSutras()
      if (category) {
        return ok(sutras.filter(s => s.category === category))
      }
      return ok(sutras)
    } catch (error) {
      console.warn('[SutraService] listSutras error, using manifest fallback:', error)
      const fallback = listSutrasFromManifest(category)
      return ok(fallback)
    }
  }

  async getSutra(id) {
    try {
      await ensureDB()
      const sutra = await sutraStorage.getSutra(id)
      if (sutra) return ok(sutra)

      const sutras = await loadRemoteSutras()
      const found = sutras.find(s => s.id === id)
      if (found) return ok(found)

      return fail('SUTRA_NOT_FOUND', '经书不存在')
    } catch (error) {
      const sutras = loadRemoteSutras()
      const found = sutras.find(s => s.id === id)
      if (found) return ok(found)
      return fail('SUTRA_NOT_FOUND', '经书不存在')
    }
  }

  async getSutraContent(id) {
    try {
      const sutras = await loadRemoteSutras()
      const sutra = sutras.find(s => s.id === id)
      if (!sutra) return fail('SUTRA_NOT_FOUND', '经书不存在')

      const filename = sutra.filename
      const response = await fetch(`/sutras/${filename}`)
      if (!response.ok) throw new Error(`Failed to load sutra content: ${response.status}`)

      const data = await response.json()
      return ok(data)
    } catch (error) {
      console.error('[SutraService] getSutraContent error:', error)
      return fail('SUTRA_CONTENT_ERROR', '获取经书内容失败', error.message)
    }
  }

  async getSutraBySlug(slug) {
    try {
      await ensureDB()
      const sutra = await sutraStorage.getSutraBySlug(slug)
      if (sutra) return ok(sutra)

      const sutras = await loadRemoteSutras()
      const found = sutras.find(s => s.slug === slug)
      if (found) return ok(found)

      return fail('SUTRA_NOT_FOUND', '经书不存在')
    } catch (error) {
      const sutras = await loadRemoteSutras()
      const found = sutras.find(s => s.slug === slug)
      if (found) return ok(found)
      return fail('SUTRA_NOT_FOUND', '经书不存在')
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
