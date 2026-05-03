import Mdict from 'mdict-js'
import lzoWasm from 'lzo-wasm'

export class MdxParser {
  constructor() {
    this.mdicts = new Map()
  }

  async loadMdx(filePath, fileData) {
    try {
      const mdict = new Mdict(fileData, {
        lzo: lzoWasm
      })
      const dictInfo = {
        mdict,
        filePath,
        loadedAt: new Date().toISOString()
      }
      this.mdicts.set(filePath, dictInfo)
      return {
        success: true,
        entryCount: mdict.entries ? mdict.entries.length : 0,
        filePath
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async lookup(filePath, term) {
    const dict = this.mdicts.get(filePath)
    if (!dict) {
      return {
        success: false,
        error: 'Dictionary not loaded'
      }
    }

    try {
      const definition = dict.mdict.lookup(term)
      return {
        success: true,
        term,
        definition: definition || null
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  unload(filePath) {
    this.mdicts.delete(filePath)
  }

  unloadAll() {
    this.mdicts.clear()
  }

  getLoadedCount() {
    return this.mdicts.size
  }
}
