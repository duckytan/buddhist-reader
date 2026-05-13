import { getDB, TABLES } from './db'

export async function getProgress(sutraId) {
  const db = await getDB()
  return db.get(TABLES.READING_PROGRESS, sutraId)
}

export async function saveProgress(sutraId, progress) {
  const db = await getDB()
  const now = new Date().toISOString()
  return db.put(TABLES.READING_PROGRESS, {
    sutraId,
    ...progress,
    lastReadAt: now
  })
}

export async function updateProgress(sutraId, updates) {
  const db = await getDB()
  const existing = await db.get(TABLES.READING_PROGRESS, sutraId)
  if (existing) {
    return db.put(TABLES.READING_PROGRESS, { ...existing, ...updates, lastReadAt: new Date().toISOString() })
  }
  return saveProgress(sutraId, updates)
}

export async function listAllProgress() {
  const db = await getDB()
  return db.getAll(TABLES.READING_PROGRESS)
}

export async function clearProgress(sutraId) {
  const db = await getDB()
  return db.delete(TABLES.READING_PROGRESS, sutraId)
}
