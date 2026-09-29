import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../utils/storage'

export const useReaderStore = defineStore('reader', () => {
  const scrollPosition = ref(0)
  const bookmarks = ref([])
  const readingTime = ref(0)
  const currentChapter = ref(0)
  const showTOC = ref(false)
  const showSettings = ref(false)

  function reset(sutraId) {
    scrollPosition.value = 0
    readingTime.value = 0
    currentChapter.value = 0
    showTOC.value = false
    showSettings.value = false
    if (sutraId) {
      bookmarks.value = storage.getObject(`bookmarks-${sutraId}`) || []
    } else {
      bookmarks.value = []
    }
  }

  function addBookmark(sutraId, chapter, position, label) {
    bookmarks.value.push({ chapter, position, label, time: Date.now() })
    if (sutraId) {
      storage.setObject(`bookmarks-${sutraId}`, bookmarks.value)
    }
  }

  function removeBookmark(sutraId, index) {
    bookmarks.value.splice(index, 1)
    if (sutraId) {
      storage.setObject(`bookmarks-${sutraId}`, bookmarks.value)
    }
  }

  function setScrollPosition(pos) {
    scrollPosition.value = pos
  }

  return {
    scrollPosition, bookmarks, readingTime, currentChapter,
    showTOC, showSettings,
    reset, addBookmark, removeBookmark, setScrollPosition
  }
})