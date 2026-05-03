import { TrieNode } from './TrieNode.js'

export class TrieBuilder {
  constructor() {
    this.root = new TrieNode()
    this.termCount = 0
  }

  insert(term, dictId) {
    if (!term || term.length === 0) return
    let node = this.root
    for (const char of term) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)
    }
    if (!node.isEnd) {
      this.termCount++
    }
    node.isEnd = true
    node.dictIds.add(dictId)
  }

  insertBatch(terms) {
    for (const { term, dictId } of terms) {
      this.insert(term, dictId)
    }
  }

  serialize() {
    const chars = []
    const isEnds = []
    const dictIdsList = []
    const childIndices = []

    const queue = [this.root]
    const indexMap = new Map()
    let currentIndex = 0

    indexMap.set(this.root, 0)
    chars.push('')
    isEnds.push(false)
    dictIdsList.push([])
    childIndices.push([])

    while (queue.length > 0) {
      const node = queue.shift()
      const nodeIndex = indexMap.get(node)

      isEnds[nodeIndex] = node.isEnd
      dictIdsList[nodeIndex] = Array.from(node.dictIds)

      const childIdxArray = []
      for (const [char, child] of node.children) {
        if (!indexMap.has(child)) {
          indexMap.set(child, chars.length)
          chars.push(char)
          isEnds.push(false)
          dictIdsList.push([])
          childIndices.push([])
          queue.push(child)
        }
        childIdxArray.push({ char, index: indexMap.get(child) })
      }
      childIndices[nodeIndex] = childIdxArray
    }

    return { chars, isEnds, dictIdsList, childIndices }
  }

  destroy() {
    this.root = null
    this.termCount = 0
  }

  getTermCount() {
    return this.termCount
  }
}
