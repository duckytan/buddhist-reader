import * as progressStorage from '@/storage/progressStore.js'
import { ok, fail } from '../interfaces/serviceResult.js'

export class ProgressServiceLocal {
  async getProgress(sutraId) {
    try {
      const progress = await progressStorage.getProgress(sutraId)
      return ok(progress || {
        sutraId,
        chapterIndex: 1,
        scrollPosition: 0,
        readPercentage: 0,
        lastReadAt: null
      })
    } catch (error) {
      return fail('PROGRESS_GET_ERROR', '获取阅读进度失败', error.message)
    }
  }

  async saveProgress(sutraId, chapterIndex, scrollPosition, readPercentage = null) {
    try {
      const progress = {
        chapterIndex,
        scrollPosition,
        readPercentage: readPercentage ?? 0
      }
      await progressStorage.saveProgress(sutraId, progress)
      return ok(null)
    } catch (error) {
      return fail('PROGRESS_SAVE_ERROR', '保存阅读进度失败', error.message)
    }
  }

  async clearProgress(sutraId) {
    try {
      await progressStorage.clearProgress(sutraId)
      return ok(null)
    } catch (error) {
      return fail('PROGRESS_CLEAR_ERROR', '清除阅读进度失败', error.message)
    }
  }

  async listAllProgress() {
    try {
      const progressList = await progressStorage.listAllProgress()
      return ok(progressList)
    } catch (error) {
      return fail('PROGRESS_LIST_ERROR', '获取阅读进度列表失败', error.message)
    }
  }
}
