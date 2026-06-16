export const SESSION_SETTINGS_STORAGE_KEY = 'pushup-session-settings'

export const DEFAULT_SESSION_SETTINGS = {
  defaultReps: 20,
  setTarget: 4,
  prepSeconds: 5,
  restSeconds: 60,
  tickBpm: 90,
  soundEnabled: true
}

function toInteger(value, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.round(numericValue)
}

export function normalizeSessionSettings(settings = {}) {
  const normalized = {
    defaultReps: toInteger(settings.defaultReps, DEFAULT_SESSION_SETTINGS.defaultReps),
    setTarget: toInteger(settings.setTarget, DEFAULT_SESSION_SETTINGS.setTarget),
    prepSeconds: toInteger(settings.prepSeconds, DEFAULT_SESSION_SETTINGS.prepSeconds),
    restSeconds: toInteger(settings.restSeconds, DEFAULT_SESSION_SETTINGS.restSeconds),
    tickBpm: toInteger(settings.tickBpm, DEFAULT_SESSION_SETTINGS.tickBpm),
    soundEnabled: settings.soundEnabled !== false
  }

  normalized.defaultReps = Math.min(1000, Math.max(1, normalized.defaultReps))
  normalized.setTarget = Math.min(50, Math.max(1, normalized.setTarget))
  normalized.prepSeconds = Math.min(30, Math.max(1, normalized.prepSeconds))
  normalized.restSeconds = Math.min(300, Math.max(5, normalized.restSeconds))
  normalized.tickBpm = Math.min(200, Math.max(30, normalized.tickBpm))

  return normalized
}

export function loadSessionSettings() {
  try {
    const savedValue = localStorage.getItem(SESSION_SETTINGS_STORAGE_KEY)
    if (!savedValue) return DEFAULT_SESSION_SETTINGS

    const parsed = JSON.parse(savedValue)
    return normalizeSessionSettings(parsed)
  } catch (error) {
    console.error('Failed to load session settings:', error)
    return DEFAULT_SESSION_SETTINGS
  }
}

export function saveSessionSettings(settings) {
  const normalized = normalizeSessionSettings(settings)
  localStorage.setItem(SESSION_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function resetSessionSettings() {
  localStorage.removeItem(SESSION_SETTINGS_STORAGE_KEY)
  return DEFAULT_SESSION_SETTINGS
}
