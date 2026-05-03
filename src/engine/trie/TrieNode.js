export class TrieNode {
  constructor() {
    this.children = new Map()
    this.isEnd = false
    this.dictIds = new Set()
  }
}
