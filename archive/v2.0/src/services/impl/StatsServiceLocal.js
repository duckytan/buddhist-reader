import * as statsStorage from '@/storage/statsStore.js'
import { ok, fail } from '../interfaces/serviceResult.js'

export class StatsServiceLocal {
  async recordRead(sutraId, chars, duration) {
    try {
      const today = new Date().toISOString().split('T')[0]
      await statsStorage.incrementReadCount(sutraId, today, chars, duration)
      return ok(null)
    } catch (error) {
      return fail('STATS_RECORD_ERROR', '记录诵读失败', error.message)
    }
  }

  async getStats(sutraId = null, startDate = null, endDate = null) {
    try {
      let allStats = await statsStorage.listAllStats()

      if (sutraId) {
        allStats = allStats.filter(s => s.sutraId === sutraId)
      }
      if (startDate) {
        allStats = allStats.filter(s => s.date >= startDate)
      }
      if (endDate) {
        allStats = allStats.filter(s => s.date <= endDate)
      }

      const summary = this._calculateSummary(allStats)
      return ok(summary)
    } catch (error) {
      return fail('STATS_GET_ERROR', '获取统计失败', error.message)
    }
  }

  async getStreakDays() {
    try {
      const allStats = await statsStorage.listAllStats()
      const today = new Date()
      let streak = 0
      let checkDate = new Date(today)

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const hasRead = allStats.some(s => s.date === dateStr && s.readCount > 0)
        if (!hasRead) break
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      }

      return ok(streak)
    } catch (error) {
      return fail('STATS_STREAK_ERROR', '计算连续天数失败', error.message)
    }
  }

  _calculateSummary(stats) {
    if (!stats || stats.length === 0) {
      return {
        totalReadCount: 0,
        totalReadChars: 0,
        totalReadDuration: 0,
        totalSutras: 0,
        streakDays: 0
      }
    }

    return {
      totalReadCount: stats.reduce((sum, s) => sum + (s.readCount || 0), 0),
      totalReadChars: stats.reduce((sum, s) => sum + (s.readChars || 0), 0),
      totalReadDuration: stats.reduce((sum, s) => sum + (s.readDuration || 0), 0),
      totalSutras: new Set(stats.map(s => s.sutraId)).size,
      streakDays: this._calcStreak(stats)
    }
  }

  _calcStreak(stats) {
    const today = new Date()
    let streak = 0
    let checkDate = new Date(today)

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasRead = stats.some(s => s.date === dateStr && s.readCount > 0)
      if (!hasRead) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return streak
  }
}
