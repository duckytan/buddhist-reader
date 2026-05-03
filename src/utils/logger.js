const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

let currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG

export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level]
  }
}

export function debug(module, message, ...args) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(`[DEBUG] ${module}: ${message}`, ...args)
  }
}

export function info(module, message, ...args) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(`[INFO] ${module}: ${message}`, ...args)
  }
}

export function warn(module, message, ...args) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(`[WARN] ${module}: ${message}`, ...args)
  }
}

export function error(module, message, ...args) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`[ERROR] ${module}: ${message}`, ...args)
  }
}
