import { getDB, TABLES } from './db'

export async function addStatistic(stat) {
  const db = await getDB()
  return db.add(TABLES.STATISTICS, stat)
}

export async function getStatistic(id) {
  const db = await getDB()
  return db.get(TABLES.STATISTICS, id)
}

export async function getStatsByDate(date) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.STATISTICS, 'date', date)
}

export async function getStatsBySutraId(sutraId) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.STATISTICS, 'sutraId', sutraId)
}

export async function getStatsBySutraAndDate(sutraId, date) {
  const db = await getDB()
  return db.getAllFromIndex(TABLES.STATISTICS, 'sutraId_date', [sutraId, date])
}

export async function upsertDailyStat(sutraId, date, statUpdates) {
  const db = await getDB()
  const existing = await getStatsBySutraAndDate(sutraId, date)
  if (existing && existing.length > 0) {
    const stat = existing[0]
    return db.put(TABLES.STATISTICS, { ...stat, ...statUpdates })
  }
  return db.add(TABLES.STATISTICS, {
    sutraId,
    date,
    readCount: statUpdates.readCount ?? 0,
    readChars: statUpdates.readChars ?? 0,
    readDuration: statUpdates.readDuration ?? 0,
    streakDays: statUpdates.streakDays ?? 0
  })
}

export async function incrementReadCount(sutraId, date, charCount = 0, duration = 0) {
  const db = await getDB()
  const existing = await getStatsBySutraAndDate(sutraId, date)
  if (existing && existing.length > 0) {
    const stat = existing[0]
    return db.put(TABLES.STATISTICS, {
      ...stat,
      readCount: (stat.readCount || 0) + 1,
      readChars: (stat.readChars || 0) + charCount,
      readDuration: (stat.readDuration || 0) + duration
    })
  }
  return db.add(TABLES.STATISTICS, {
    sutraId,
    date,
    readCount: 1,
    readChars: charCount,
    readDuration: duration,
    streakDays: 0
  })
}

export async function listAllStats() {
  const db = await getDB()
  return db.getAll(TABLES.STATISTICS)
}
