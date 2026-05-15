const PREFIX = 'br-'
let memoryFallback = {}

function isLocalStorageAvailable() {
  try {
    const key = '__test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const available = isLocalStorageAvailable()

function getStore() {
  return available ? localStorage : memoryFallback
}

function key(k) { return PREFIX + k }

export const storage = {
  get(keyStr) {
    try { return getStore().getItem(key(keyStr)) } catch { return null }
  },
  set(keyStr, value) {
    try { getStore().setItem(key(keyStr), value) } catch { return false }
  },
  remove(keyStr) {
    try { getStore().removeItem(key(keyStr)) } catch { /* ignore */ }
  },
  getObject(keyStr) {
    const raw = this.get(keyStr)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  },
  setObject(keyStr, obj) {
    return this.set(keyStr, JSON.stringify(obj))
  },
  getString(keyStr, fallback = '') {
    const v = this.get(keyStr)
    return v ?? fallback
  },
  getNumber(keyStr, fallback = 0) {
    const v = this.get(keyStr)
    return v !== null ? Number(v) : fallback
  },
  setNumber(keyStr, num) {
    return this.set(keyStr, String(num))
  }
}