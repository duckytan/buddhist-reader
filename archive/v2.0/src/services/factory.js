import { SutraServiceLocal } from './impl/SutraServiceLocal.js'
import { DictServiceLocal } from './impl/DictServiceLocal.js'
import { ProgressServiceLocal } from './impl/ProgressServiceLocal.js'
import { StatsServiceLocal } from './impl/StatsServiceLocal.js'
import { TTSServiceLocal } from './impl/TTSServiceLocal.js'
import { SettingServiceLocal } from './impl/SettingServiceLocal.js'

let services = null

export function initServices(mode = 'local') {
  if (mode === 'api') {
    services = {
      sutra: null,
      dict: null,
      progress: null,
      stats: null,
      tts: null,
      setting: null
    }
  } else {
    services = {
      sutra: new SutraServiceLocal(),
      dict: new DictServiceLocal(),
      progress: new ProgressServiceLocal(),
      stats: new StatsServiceLocal(),
      tts: new TTSServiceLocal(),
      setting: new SettingServiceLocal()
    }
  }
  return services
}

export function getServices() {
  if (!services) {
    return initServices()
  }
  return services
}
