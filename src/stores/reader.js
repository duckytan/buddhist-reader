import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useReaderStore = defineStore('reader', () => {
  const scrollPosition = ref(0)
  const bookmarks = ref([])
  const readingTime = ref(0)
  const currentChapter = ref(0)
  const showTOC = ref(false)
  const showSettings = ref(false)

  function reset() {
    scrollPosition.value = 0
    bookmarks.value = []
    readingTime.value = 0
    currentChapter.value = 0
    showTOC.value = false
    showSettings.value = false
  }

  function addBookmark(chapter, position, label) {
    bookmarks.value.push({ chapter, position, label, time: Date.now() })
  }

  function removeBookmark(index) {
    bookmarks.value.splice(index, 1)
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