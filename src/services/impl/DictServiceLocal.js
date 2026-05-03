import * as dictStorage from '@/storage/dictStore.js'
import { ok, fail } from '../interfaces/serviceResult.js'
import { builtinDictionary, searchBuiltinTerms, getBuiltinTermCount } from '@/data/builtinDictionary.js'

export class DictServiceLocal {
  async listDictionaries() {
    try {
      const dicts = await dictStorage.listDictionaries()
      const builtin = {
        id: 0,
        name: '内置词典',
        type: 'builtin',
        authority: 'official',
        isActive: true,
        entryCount: getBuiltinTermCount(),
        mdxStrategy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return ok([builtin, ...dicts])
    } catch (error) {
      return fail('DICT_LIST_ERROR', '获取词典列表失败', error.message)
    }
  }

  async getDictionary(id) {
    try {
      if (id === 0) {
        return ok({
          id: 0,
          name: '内置词典',
          type: 'builtin',
          authority: 'official',
          isActive: true,
          entryCount: getBuiltinTermCount()
        })
      }
      const dict = await dictStorage.getDictionary(id)
      if (dict) return ok(dict)
      return fail('DICT_NOT_FOUND', '词典不存在')
    } catch (error) {
      return fail('DICT_GET_ERROR', '获取词典失败', error.message)
    }
  }

  async toggleDictionary(id, isActive) {
    try {
      if (id === 0) {
        return ok(null)
      }
      const result = await dictStorage.toggleDictionary(id, isActive)
      if (result) return ok(result)
      return fail('DICT_NOT_FOUND', '词典不存在')
    } catch (error) {
      return fail('DICT_TOGGLE_ERROR', '切换词典失败', error.message)
    }
  }

  async deleteDictionary(id) {
    try {
      await dictStorage.deleteDictionary(id)
      return ok(null)
    } catch (error) {
      return fail('DICT_DELETE_ERROR', '删除词典失败', error.message)
    }
  }

  async lookupTerms(term, activeDictIds = null) {
    try {
      const results = []

      if (!activeDictIds || activeDictIds.includes(0)) {
        const builtinMatch = builtinDictionary.find(d => d.term === term)
        if (builtinMatch) {
          results.push({
            dictId: 0,
            dictName: '内置词典',
            term: builtinMatch.term,
            definition: builtinMatch.definition,
            format: 'markdown',
            pinyin: builtinMatch.pinyin,
            category: builtinMatch.category
          })
        }
      }

      if (activeDictIds && activeDictIds.length > 0) {
        for (const dictId of activeDictIds) {
          if (dictId === 0) continue
          const entries = await dictStorage.getDictEntriesByTerm(term)
          for (const entry of entries) {
            if (activeDictIds.includes(entry.dictId)) {
              results.push({
                dictId: entry.dictId,
                dictName: `词典 ${entry.dictId}`,
                term: entry.term,
                definition: entry.definition,
                format: entry.format || 'markdown',
                pinyin: entry.pinyin,
                category: entry.category
              })
            }
          }
        }
      }

      return ok(results)
    } catch (error) {
      return fail('DICT_LOOKUP_ERROR', '查询词条失败', error.message)
    }
  }

  async importDictionary(file) {
    try {
      const content = await file.text()
      const ext = file.name.split('.').pop().toLowerCase()

      if (ext === 'json') {
        return this._importJson(file.name, content)
      } else if (ext === 'csv') {
        return this._importCsv(file.name, content)
      } else {
        return fail('DICT_UNSUPPORTED_TYPE', '不支持的词典格式')
      }
    } catch (error) {
      return fail('DICT_IMPORT_ERROR', '导入词典失败', error.message)
    }
  }

  async _importJson(filename, content) {
    try {
      const data = JSON.parse(content)
      const dictId = await dictStorage.addDictionary({
        name: filename.replace(/\.[^.]+$/, ''),
        type: 'json',
        authority: 'personal',
        isActive: true,
        entryCount: 0
      })

      let count = 0
      for (const item of data) {
        if (item.term && item.definition) {
          const key = `${dictId}::${item.term}`
          await dictStorage.addDictEntry({
            key,
            term: item.term,
            dictId,
            definition: item.definition,
            format: 'markdown',
            pinyin: item.pinyin || null,
            category: item.category || 'term',
            updatedAt: new Date().toISOString()
          })
          await dictStorage.addTermLookup({
            key,
            term: item.term,
            dictId,
            chunkId: null
          })
          count++
        }
      }

      return ok({ dictId, entryCount: count })
    } catch (error) {
      return fail('DICT_PARSE_ERROR', '解析 JSON 词典失败', error.message)
    }
  }

  async _importCsv(filename, content) {
    try {
      const lines = content.split('\n').filter(line => line.trim())
      const dictId = await dictStorage.addDictionary({
        name: filename.replace(/\.[^.]+$/, ''),
        type: 'csv',
        authority: 'personal',
        isActive: true,
        entryCount: 0
      })

      let count = 0
      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length >= 2) {
          const term = parts[0].trim()
          const definition = parts.slice(1).join(',').trim()
          const key = `${dictId}::${term}`
          await dictStorage.addDictEntry({
            key,
            term,
            dictId,
            definition,
            format: 'markdown',
            pinyin: null,
            category: 'term',
            updatedAt: new Date().toISOString()
          })
          await dictStorage.addTermLookup({
            key,
            term,
            dictId,
            chunkId: null
          })
          count++
        }
      }

      return ok({ dictId, entryCount: count })
    } catch (error) {
      return fail('DICT_PARSE_ERROR', '解析 CSV 词典失败', error.message)
    }
  }
}
