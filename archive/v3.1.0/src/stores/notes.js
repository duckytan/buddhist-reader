import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../utils/storage'

export const useNotesStore = defineStore('notes', () => {
  const allNotes = ref({})

  function getNotes(sutraId) {
    const key = `notes-${sutraId}`
    const existing = storage.getObject(key) || []
    allNotes.value[sutraId] = existing
    return existing
  }

  function getAllNotes() {
    const result = []
    for (const sutraId of Object.keys(allNotes.value)) {
      for (const note of allNotes.value[sutraId]) {
        result.push({ ...note, sutraId })
      }
    }
    return result.sort((a, b) => (b.createdAt || b.time) - (a.createdAt || a.time))
  }

  function addNote(sutraId, quote, text) {
    if (!text.trim()) return null
    const notes = getNotes(sutraId)
    const note = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      quote,
      text: text.trim(),
      time: Date.now(),
      createdAt: Date.now(),
      paragraphId: ''
    }
    const updated = [...notes, note]
    storage.setObject(`notes-${sutraId}`, updated)
    allNotes.value[sutraId] = updated
    return note
  }

  function updateNote(sutraId, noteId, newText) {
    const notes = getNotes(sutraId)
    const index = notes.findIndex(n => n.id === noteId)
    if (index === -1) return
    notes[index].text = newText.trim()
    notes[index].updatedAt = Date.now()
    storage.setObject(`notes-${sutraId}`, notes)
    allNotes.value[sutraId] = notes
  }

  function deleteNote(sutraId, noteId) {
    const notes = getNotes(sutraId)
    const filtered = notes.filter(n => n.id !== noteId)
    storage.setObject(`notes-${sutraId}`, filtered)
    allNotes.value[sutraId] = filtered
  }

  function searchNotes(query) {
    const all = getAllNotes()
    if (!query || !query.trim()) return all
    const q = query.trim().toLowerCase()
    return all.filter(n =>
      (n.quote && n.quote.toLowerCase().includes(q)) ||
      (n.text && n.text.toLowerCase().includes(q))
    )
  }

  return {
    allNotes,
    getNotes,
    getAllNotes,
    addNote,
    updateNote,
    deleteNote,
    searchNotes
  }
})
