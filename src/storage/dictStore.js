import { getDB, TABLES } from './db'

export async function addDictionary(dict) {
  const db = await getDB()
  const now = new Date().toISOString()
  return db.add(TABLES.DICTIONARIES, {
    ...dict,
    isActive: dict.isActive ?? true,
    createdAt: now,
    updatedAt: now
  })
}

export async function getDictionary(id) {
  const db = await getDB()
  return db.get(TABLES.DICTIONARIES, id)
}

export async function listDictionaries() {
  const db = await getDB()
  return db.getAll(TABLES.DICTIONARIES)
}

export async function toggleDictionary(id, isActive) {
  const db = await getDB()
  const dict = await db.get(TABLES.DICTIONARIES, id)
  if (!dict) return null
  dict.isActive = isActive
  dict.updatedAt = new Date().toISOString()
  return db.put(TABLES.DICTIONARIES, dict)
}

export async function deleteDictionary(id) {
  const db = await getDB()
  await db.delete(TABLES.DICTIONARIES, id)
  const tx = db.transaction([TABLES.DICT_ENTRIES, TABLES.DICT_TERM_LOOKUP], 'readwrite')
  const entriesStore = tx.objectStore(TABLES.DICT_ENTRIES)
  const lookupStore = tx.objectStore(TABLES.DICT_TERM_LOOKUP)
  const entriesIndex = entriesStore.index('dictId')
  const lookupIndex = lookupStore.index('dictId')
  let cursor = await entriesIndex.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  cursor = await lookupIndex.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
}

export async function addDictEntry(entry) {
  const db = await getDB()
  return db.put(TABLES.DICT_ENTRIES, entry)
}

export async function getDictEntry(key) {
  const db = await getDB()
  return db.get(TABLES.DICT_ENTRIES, key)
}

export async function getDictEntriesByTerm(term) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.DICT_ENTRIES, 'term', term)
}

export async function getDictEntriesByDictId(dictId) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.DICT_ENTRIES, 'dictId', dictId)
}

export async function addTermLookup(lookup) {
  const db = await getDB()
  return db.put(TABLES.DICT_TERM_LOOKUP, lookup)
}

export async function getTermLookupsByDictId(dictId) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.DICT_TERM_LOOKUP, 'dictId', dictId)
}
