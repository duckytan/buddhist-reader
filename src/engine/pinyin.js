import { pronunciationMap } from '@/data/pronunciationMap.js'

export class PinyinEngine {
  constructor() {
    this.pronunciationMap = new Map(Object.entries(pronunciationMap))
  }

  getPronunciation(text) {
    return this.pronunciationMap.get(text) || null
  }

  applyPronunciation(text) {
    let result = text
    for (const [term, pinyin] of this.pronunciationMap) {
      if (result.includes(term)) {
        result = result.replaceAll(term, `${term}（${pinyin}）`)
      }
    }
    return result
  }

  hasSpecialPronunciation(text) {
    for (const term of this.pronunciationMap.keys()) {
      if (text.includes(term)) {
        return true
      }
    }
    return false
  }

  addPronunciation(term, pinyin) {
    this.pronunciationMap.set(term, pinyin)
  }

  removePronunciation(term) {
    this.pronunciationMap.delete(term)
  }

  getAllTerms() {
    return Array.from(this.pronunciationMap.keys())
  }
}

export const pinyinEngine = new PinyinEngine()
