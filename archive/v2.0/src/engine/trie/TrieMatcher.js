export class TrieMatcher {
  constructor(serializedData) {
    this.deserialize(serializedData)
  }

  deserialize(data) {
    const { chars, isEnds, dictIdsList, childIndices } = data
    this.chars = chars
    this.isEnds = isEnds
    this.dictIdsList = dictIdsList
    this.childIndices = childIndices
    this.rootIndex = 0
  }

  match(text, startIdx, maxLen = 20) {
    let nodeIndex = this.rootIndex
    let lastEnd = -1
    let lastDictIds = []

    const limit = Math.min(startIdx + maxLen, text.length)
    for (let i = startIdx; i < limit; i++) {
      const char = text[i]
      const children = this.childIndices[nodeIndex]
      let foundChild = null

      for (const child of children) {
        if (child.char === char) {
          foundChild = child
          break
        }
      }

      if (!foundChild) break

      nodeIndex = foundChild.index
      if (this.isEnds[nodeIndex]) {
        lastEnd = i
        lastDictIds = this.dictIdsList[nodeIndex]
      }
    }

    if (lastEnd >= 0) {
      return {
        term: text.slice(startIdx, lastEnd + 1),
        endIdx: lastEnd,
        dictIds: lastDictIds
      }
    }
    return null
  }

  getTermCount() {
    return this.isEnds.filter(Boolean).length
  }
}
