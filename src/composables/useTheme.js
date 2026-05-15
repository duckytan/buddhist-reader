import { useSettingsStore } from '../stores/settings'

export function useTheme() {
  const settingsStore = useSettingsStore()

  function setTheme(name) {
    settingsStore.setTheme(name)
  }

  function initTheme() {
    settingsStore.initFromStorage()
  }

  function cycleTheme() {
    const themes = settingsStore.themes
    const idx = themes.indexOf(settingsStore.theme)
    setTheme(themes[(idx + 1) % themes.length])
  }

  return { setTheme, initTheme, cycleTheme }
}