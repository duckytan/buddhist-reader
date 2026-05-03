import { getDB, TABLES } from './db'

const DEFAULT_SETTINGS = {
  theme: 'day',
  fontSize: 18,
  lineHeight: 1.8,
  pageMargin: 16,
  highlightMode: 'background',
  displayMode: 'expandFirst',
  ttsRate: 1.0,
  ttsEnabled: true
}

export async function getSetting(key) {
  const db = await getDB()
  const result = await db.get(TABLES.SETTINGS, key)
  if (result) return result.value
  return DEFAULT_SETTINGS[key]
}

export async function setSetting(key, value, category = 'display') {
  const db = await getDB()
  return db.put(TABLES.SETTINGS, {
    key,
    value,
    category,
    updatedAt: new Date().toISOString()
  })
}

export async function getAllSettings() {
  const db = await getDB()
  const stored = await db.getAll(TABLES.SETTINGS)
  const settings = { ...DEFAULT_SETTINGS }
  for (const item of stored) {
    settings[item.key] = item.value
  }
  return settings
}

export async function resetSetting(key) {
  const db = await getDB()
  if (key in DEFAULT_SETTINGS) {
    return db.delete(TABLES.SETTINGS, key)
  }
  return null
}

export async function resetAllSettings() {
  const db = await getDB()
  const all = await db.getAll(TABLES.SETTINGS)
  for (const item of all) {
    await db.delete(TABLES.SETTINGS, item.key)
  }
  return DEFAULT_SETTINGS
}
