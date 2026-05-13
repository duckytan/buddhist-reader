import { defineStore } from 'pinia'
import { getServices } from '@/services/factory.js'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    summary: {
      totalReadCount: 0,
      totalReadChars: 0,
      totalReadDuration: 0,
      totalSutras: 0,
      streakDays: 0
    },
    dailyStats: [],
    loading: false,
    error: null
  }),

  getters: {
    totalReadCount: (state) => state.summary.totalReadCount,
    totalReadChars: (state) => state.summary.totalReadChars,
    totalReadMinutes: (state) => Math.round(state.summary.totalReadDuration / 60),
    streakDays: (state) => state.summary.streakDays,

    meritLevel: (state) => {
      const count = state.summary.totalReadCount
      if (count >= 1000) return 'legendary'
      if (count >= 500) return 'master'
      if (count >= 100) return 'adept'
      if (count >= 50) return 'practitioner'
      if (count >= 10) return 'beginner'
      return 'novice'
    },

    meritTitle: (state) => {
      const titles = {
        legendary: '大成就者',
        master: '法师',
        adept: '修行者',
        practitioner: '学人',
        beginner: '初学',
        novoice: '善信'
      }
      return titles[state.meritLevel] || '善信'
    }
  },

  actions: {
    async loadStats(sutraId = null, startDate = null, endDate = null) {
      this.loading = true
      this.error = null
      try {
        const services = getServices()
        const result = await services.stats.getStats(sutraId, startDate, endDate)
        if (result.success) {
          this.summary = result.data
          const streakResult = await services.stats.getStreakDays()
          if (streakResult.success) {
            this.summary.streakDays = streakResult.data
          }
        } else {
          this.error = result.error.message
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async recordRead(chars, duration = 0) {
      const services = getServices()
      await services.stats.recordRead(chars, duration)
      await this.loadStats()
    },

    formatDuration(seconds) {
      if (!seconds || seconds < 60) {
        return `${seconds || 0}秒`
      }
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟`
      }
      return `${minutes}分钟`
    }
  }
})
