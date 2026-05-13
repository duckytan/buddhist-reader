import { getDB, TABLES } from './db'

export async function addNote(note) {
  const db = await getDB()
  const now = new Date().toISOString()
  return db.add(TABLES.USER_NOTES, {
    ...note,
    isEncrypted: note.isEncrypted ?? false,
    createdAt: now,
    updatedAt: now
  })
}

export async function getNote(id) {
  const db = await getDB()
  return db.get(TABLES.USER_NOTES, id)
}

export async function getNotesByEntryKey(entryKey) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.USER_NOTES, 'entryKey', entryKey)
}

export async function getNotesBySutraId(sutraId) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.USER_NOTES, 'sutraId', sutraId)
}

export async function updateNote(id, updates) {
  const db = await getDB()
  const existing = await db.get(TABLES.USER_NOTES, id)
  if (!existing) return null
  return db.put(TABLES.USER_NOTES, {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  })
}

export async function deleteNote(id) {
  const db = await getDB()
  return db.delete(TABLES.USER_NOTES, id)
}

export async function listAllNotes() {
  const db = await getDB()
  return db.getAll(TABLES.USER_NOTES)
}
