import { getDB, TABLES } from './db'

export async function addSutra(sutra) {
  const db = await getDB()
  return db.add(TABLES.SUTRAS, {
    ...sutra,
    createdAt: new Date().toISOString()
  })
}

export async function getSutra(id) {
  const db = await getDB()
  return db.get(TABLES.SUTRAS, id)
}

export async function getSutraBySlug(slug) {
  const db = await getDB()
  return db.getFromIndex(TABLES.SUTRAS, 'slug', slug)
}

export async function listSutras(category = null) {
  const db = await getDB()
  if (category) {
    return db.getAllFromIndex(TABLES.SUTRAS, 'category', category)
  }
  return db.getAll(TABLES.SUTRAS)
}

export async function updateSutra(id, updates) {
  const db = await getDB()
  const existing = await db.get(TABLES.SUTRAS, id)
  if (!existing) return null
  return db.put(TABLES.SUTRAS, { ...existing, ...updates })
}

export async function deleteSutra(id) {
  const db = await getDB()
  await db.delete(TABLES.SUTRAS, id)
  const tx = db.transaction(TABLES.SUTRA_CHAPTERS, 'readwrite')
  const index = await tx.store.index('sutraId')
  let c = await index.openCursor(IDBKeyRange.only(id))
  while (c) {
    await c.delete()
    c = await c.continue()
  }
}
