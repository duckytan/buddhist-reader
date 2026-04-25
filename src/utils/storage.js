/**
 * localStorage 工具函数
 * 封装常用的本地存储操作
 */

const STORAGE_PREFIX = 'buddhist-reader-'

/**
 * 保存数据到 localStorage
 * @param {String} key - 键名
 * @param {*} value - 要保存的值（会自动序列化为 JSON）
 * @returns {Boolean} 是否成功
 */
export function saveStorage(key, value) {
  try {
    const fullKey = STORAGE_PREFIX + key
    const serialized = JSON.stringify(value)
    localStorage.setItem(fullKey, serialized)
    return true
  } catch (error) {
    console.error('Failed to save to storage:', error)
    return false
  }
}

/**
 * 从 localStorage 读取数据
 * @param {String} key - 键名
 * @param {*} defaultValue - 默认值（当键不存在时返回）
 * @returns {*} 读取到的值或默认值
 */
export function loadStorage(key, defaultValue = null) {
  try {
    const fullKey = STORAGE_PREFIX + key
    const serialized = localStorage.getItem(fullKey)
    if (serialized === null) {
      return defaultValue
    }
    return JSON.parse(serialized)
  } catch (error) {
    console.error('Failed to load from storage:', error)
    return defaultValue
  }
}

/**
 * 删除 localStorage 中的数据
 * @param {String} key - 键名
 * @returns {Boolean} 是否成功
 */
export function removeStorage(key) {
  try {
    const fullKey = STORAGE_PREFIX + key
    localStorage.removeItem(fullKey)
    return true
  } catch (error) {
    console.error('Failed to remove from storage:', error)
    return false
  }
}

/**
 * 清除所有应用相关的 localStorage 数据
 * @returns {Boolean} 是否成功
 */
export function clearStorage() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    return true
  } catch (error) {
    console.error('Failed to clear storage:', error)
    return false
  }
}

/**
 * 获取所有应用相关的存储键
 * @returns {Array} 键名数组
 */
export function getStorageKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''))
    }
  }
  return keys
}

/**
 * 检查存储空间是否已满
 * @returns {Boolean} 是否已满
 */
export function isStorageFull() {
  try {
    const testKey = STORAGE_PREFIX + 'storage-test'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return false
  } catch (error) {
    return true
  }
}

/**
 * 获取已使用的存储空间大小（近似值）
 * @returns {Number} 字节数
 */
export function getStorageSize() {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key)
      total += key.length + value.length
    }
  }
  return total
}
