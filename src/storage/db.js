import { openDB } from 'idb'

const DB_NAME = 'buddhist-reader-v2'
const DB_VERSION = 1

const TABLE_DEFINITIONS = [
  {
    name: 'dictionaries',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'authority', keyPath: 'authority' },
      { name: 'isActive', keyPath: 'isActive' }
    ]
  },
  {
    name: 'dict_entries',
    options: { keyPath: 'key' },
    indexes: [
      { name: 'term', keyPath: 'term' },
      { name: 'dictId', keyPath: 'dictId' }
    ]
  },
  {
    name: 'dict_term_lookup',
    options: { keyPath: 'key' },
    indexes: [
      { name: 'dictId', keyPath: 'dictId' },
      { name: 'chunkId', keyPath: 'chunkId' }
    ]
  },
  {
    name: 'dictionary_chunks',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'dictId', keyPath: 'dictId' }
    ]
  },
  {
    name: 'dictionary_versions',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'dictId', keyPath: 'dictId' },
      { name: 'version', keyPath: 'version' }
    ]
  },
  {
    name: 'sutras',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'slug', keyPath: 'slug', unique: true },
      { name: 'category', keyPath: 'category' }
    ]
  },
  {
    name: 'sutra_chapters',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'sutraId', keyPath: 'sutraId' },
      { name: 'chapterIndex', keyPath: 'chapterIndex' }
    ]
  },
  {
    name: 'user_notes',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'entryKey', keyPath: 'entryKey' },
      { name: 'sutraId', keyPath: 'sutraId' },
      { name: 'updatedAt', keyPath: 'updatedAt' }
    ]
  },
  {
    name: 'user_highlights',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'sutraId', keyPath: 'sutraId' },
      { name: 'term', keyPath: 'term' }
    ]
  },
  {
    name: 'reading_progress',
    options: { keyPath: 'sutraId' },
    indexes: []
  },
  {
    name: 'settings',
    options: { keyPath: 'key' },
    indexes: []
  },
  {
    name: 'statistics',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'sutraId', keyPath: 'sutraId' },
      { name: 'date', keyPath: 'date' },
      { name: 'sutraId_date', keyPath: ['sutraId', 'date'] }
    ]
  },
  {
    name: 'file_cache',
    options: { keyPath: 'key' },
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'expiresAt', keyPath: 'expiresAt' }
    ]
  }
]

let dbPromise = null

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          for (const tableDef of TABLE_DEFINITIONS) {
            createTable(db, tableDef)
          }
        }
      }
    })
  }
  return dbPromise
}

function createTable(db, { name, options, indexes }) {
  const store = db.createObjectStore(name, options)
  if (indexes) {
    for (const index of indexes) {
      store.createIndex(index.name, index.keyPath, { unique: index.unique || false })
    }
  }
}

export function getDB() {
  if (!dbPromise) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return dbPromise
}

export async function resetDB() {
  if (typeof indexedDB !== 'undefined') {
    await indexedDB.deleteDatabase(DB_NAME)
  }
  dbPromise = null
  return initDB()
}

export const TABLES = {
  DICTIONARIES: 'dictionaries',
  DICT_ENTRIES: 'dict_entries',
  DICT_TERM_LOOKUP: 'dict_term_lookup',
  DICTIONARY_CHUNKS: 'dictionary_chunks',
  DICTIONARY_VERSIONS: 'dictionary_versions',
  SUTRAS: 'sutras',
  SUTRA_CHAPTERS: 'sutra_chapters',
  USER_NOTES: 'user_notes',
  USER_HIGHLIGHTS: 'user_highlights',
  READING_PROGRESS: 'reading_progress',
  SETTINGS: 'settings',
  STATISTICS: 'statistics',
  FILE_CACHE: 'file_cache'
}
