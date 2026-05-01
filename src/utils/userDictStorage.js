/**
 * IndexedDB 工具：存储用户自定义词典
 * 使用 IndexedDB 而非 localStorage，因为词典文件可能很大（50MB+）
 */

const DB_NAME = 'buddhist-reader-dicts'
const STORE_NAME = 'user-dictionaries'
const DB_VERSION = 1

/**
 * 打开数据库连接
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 保存用户词典
 * @param {string} id - 词典唯一 ID
 * @param {string} name - 词典显示名称
 * @param {Array} entries - 词条数组
 */
export async function saveUserDictionary(id, name, entries) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id, name, entries, createdAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 获取所有用户词典列表
 */
export async function getUserDictionaries() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取用户词典的所有词条
 */
export async function getUserDictEntries() {
  const dicts = await getUserDictionaries()
  const allEntries = []

  for (const dict of dicts) {
    for (const entry of dict.entries) {
      allEntries.push({
        term: entry.t || entry.term,
        definition: entry.d || entry.definition,
        _dictId: `user-${dict.id}`,
        _dictName: dict.name,
        _isUserDict: true
      })
    }
  }

  return allEntries
}

/**
 * 删除用户词典
 */
export async function deleteUserDictionary(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 清空所有用户词典
 */
export async function clearAllUserDictionaries() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
