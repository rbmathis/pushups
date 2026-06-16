<template>
  <div class="w-full max-w-md mx-auto p-6 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
    <h2 class="text-2xl font-bold text-white mb-4">Log Pushups</h2>

    <div class="mb-5 bg-gray-800 rounded-lg p-1 grid grid-cols-2 gap-1">
      <button
        type="button"
        class="px-3 py-2 text-sm font-semibold rounded-md transition-colors"
        :class="entryMode === 'manual' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'"
        @click="setEntryMode('manual')"
      >
        Manual
      </button>
      <button
        type="button"
        class="px-3 py-2 text-sm font-semibold rounded-md transition-colors"
        :class="entryMode === 'session' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'"
        @click="setEntryMode('session')"
      >
        Session
      </button>
    </div>

    <transition name="fade">
      <div
        v-if="errorMessage"
        class="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 text-sm"
        role="alert"
        aria-live="polite"
      >
        <span class="font-semibold">Error:</span> {{ errorMessage }}
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="successMessage"
        class="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg text-green-100 text-sm"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ successMessage }}
      </div>
    </transition>

    <form v-if="entryMode === 'manual'" @submit.prevent="submitManualForm" class="space-y-4">
      <div>
        <label for="pushup-count" class="block text-sm font-medium text-gray-300 mb-2">
          Number of Pushups
        </label>
        <div class="relative">
          <input
            id="pushup-count"
            v-model.number="manualPushupCount"
            type="number"
            min="1"
            max="1000"
            placeholder="Enter number of pushups"
            aria-label="Number of pushups to log"
            :disabled="isManualLoading"
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <span class="absolute right-3 top-2.5 text-gray-500 text-sm font-medium">
            💪
          </span>
        </div>
        <div v-if="manualValidationError" class="mt-2 text-red-400 text-xs font-medium">
          {{ manualValidationError }}
        </div>
        <div class="mt-2 text-gray-400 text-xs">
          Range: 1 - 1000 pushups
        </div>
      </div>

      <button
        type="submit"
        :disabled="isManualLoading || !!manualValidationError"
        aria-label="Log pushups button"
        class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
      >
        <span v-if="isManualLoading" class="inline-block animate-spin">⏳</span>
        <span>{{ isManualLoading ? 'Logging...' : 'Log Pushups' }}</span>
      </button>

      <p class="text-center text-gray-400 text-xs">
        {{ manualPushupCount ? `Ready to log ${manualPushupCount} pushup${manualPushupCount !== 1 ? 's' : ''}` : 'Enter a number to continue' }}
      </p>
    </form>

    <div v-else class="space-y-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="session-default-reps" class="block text-xs font-medium text-gray-300 mb-2">
              Default Reps
            </label>
            <input
              id="session-default-reps"
              v-model.number="sessionPushupCount"
              type="number"
              min="1"
              max="1000"
              :disabled="isSessionRunning || isSessionSubmitting"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label for="session-set-target" class="block text-xs font-medium text-gray-300 mb-2">
              Set Target
            </label>
            <input
              id="session-set-target"
              v-model.number="sessionSetTarget"
              type="number"
              min="1"
              max="50"
              :disabled="isSessionRunning"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div v-if="sessionValidationError" class="text-red-400 text-xs font-medium">
          {{ sessionValidationError }}
        </div>

        <div class="rounded-lg bg-gray-900 border border-gray-700 p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs uppercase tracking-wide text-gray-400">Phase</span>
            <span class="text-sm font-semibold text-white">{{ phaseLabel }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span class="text-xs uppercase tracking-wide text-gray-400">Set Progress</span>
            <span class="text-sm text-gray-200">
              {{ completedSetCount }} completed / goal {{ sessionSetTarget }}
            </span>
          </div>
          <div v-if="goalReached" class="mt-2 text-xs text-green-400">
            Goal reached — keep going or stop whenever you want.
          </div>
          <div v-if="isSessionRunning && phaseCountdownLabel" class="mt-3 text-center">
            <span class="text-3xl font-bold text-blue-300 tabular-nums">{{ phaseCountdownLabel }}</span>
          </div>
          <div v-if="sessionPhase === 'active'" class="mt-2 text-center text-xs text-gray-300">
            Set {{ activeSetNumber }} elapsed: {{ formattedElapsedSetTime }}
          </div>
          <div v-if="sessionPhase === 'active'" class="mt-3">
            <label for="session-pushup-count" class="block text-sm font-medium text-gray-300 mb-2">
              Pushups completed this set
            </label>
            <input
              id="session-pushup-count"
              v-model.number="sessionPushupCount"
              type="number"
              min="1"
              max="1000"
              :disabled="isSessionSubmitting"
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-if="!isSessionRunning"
            type="button"
            :disabled="!!sessionValidationError"
            class="col-span-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
            @click="startSession"
          >
            Start Session
          </button>
          <button
            v-if="sessionPhase === 'active'"
            type="button"
            :disabled="isSessionSubmitting || !!sessionValidationError"
            class="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
            @click="logActiveSet"
          >
            {{ isSessionSubmitting ? 'Logging...' : 'Log Set' }}
          </button>
          <button
            v-if="isSessionRunning"
            type="button"
            class="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all"
            :class="sessionPhase === 'active' ? '' : 'col-span-2'"
            @click="stopSession"
          >
            Stop Session
          </button>
        </div>
      </div>

      <div v-if="showSessionSummary" class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-white mb-3">Session Summary</h3>
        <div class="space-y-1 text-sm text-gray-200">
          <p>Sets completed: {{ completedSetCount }}</p>
          <p>Total pushups: {{ totalSessionPushups }}</p>
          <p>Average reps per set: {{ averageRepsPerSet }}</p>
          <p>Duration: {{ formattedSessionDuration }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import axios from 'axios'
import { loadSessionSettings } from '../utils/sessionSettings'

const emit = defineEmits(['pushups-logged'])
const sessionSettings = loadSessionSettings()

const entryMode = ref('manual')
const manualPushupCount = ref(30)
const isManualLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const sessionPushupCount = ref(sessionSettings.defaultReps)
const sessionSetTarget = ref(sessionSettings.setTarget)
const prepCountdownSeconds = ref(sessionSettings.prepSeconds)
const restCountdownSeconds = ref(sessionSettings.restSeconds)
const tickBpm = ref(sessionSettings.tickBpm)
const soundEnabled = ref(sessionSettings.soundEnabled)
const isSessionRunning = ref(false)
const isSessionSubmitting = ref(false)
const sessionPhase = ref('idle')
const sessionCountdownSeconds = ref(0)
const currentSetElapsedSeconds = ref(0)
const completedSetReps = ref([])
const sessionStartedAt = ref(null)
const sessionEndedAt = ref(null)

const phaseIntervalId = ref(null)
const elapsedIntervalId = ref(null)
const tickIntervalId = ref(null)
const messageTimeoutId = ref(null)
const audioContextRef = ref(null)

const manualValidationError = computed(() => validatePushupCount(manualPushupCount.value))

const sessionValidationError = computed(() => {
  const repsError = validatePushupCount(sessionPushupCount.value)
  if (repsError) return repsError
  if (!Number.isInteger(sessionSetTarget.value) || sessionSetTarget.value < 1 || sessionSetTarget.value > 50) {
    return 'Set target must be between 1 and 50'
  }
  return null
})

const completedSetCount = computed(() => completedSetReps.value.length)
const totalSessionPushups = computed(() => completedSetReps.value.reduce((sum, reps) => sum + reps, 0))
const goalReached = computed(() => completedSetCount.value >= sessionSetTarget.value)
const activeSetNumber = computed(() => completedSetCount.value + 1)

const averageRepsPerSet = computed(() => {
  if (completedSetCount.value === 0) return 0
  return Math.round((totalSessionPushups.value / completedSetCount.value) * 10) / 10
})

const showSessionSummary = computed(() => !isSessionRunning.value && completedSetCount.value > 0)

const phaseLabel = computed(() => {
  if (!isSessionRunning.value && completedSetCount.value === 0) return 'Not started'
  if (!isSessionRunning.value && completedSetCount.value > 0) return 'Stopped'

  switch (sessionPhase.value) {
    case 'prep':
      return 'Get Ready'
    case 'active':
      return `Set ${activeSetNumber.value} - GO`
    case 'rest':
      return 'Rest'
    default:
      return 'Session running'
  }
})

const phaseCountdownLabel = computed(() => {
  if (sessionPhase.value === 'prep') return `${sessionCountdownSeconds.value}s`
  if (sessionPhase.value === 'rest') return `${sessionCountdownSeconds.value}s`
  return ''
})

const formattedElapsedSetTime = computed(() => formatSeconds(currentSetElapsedSeconds.value))

const formattedSessionDuration = computed(() => {
  if (!sessionStartedAt.value) return '00:00'
  const endTime = sessionEndedAt.value ?? Date.now()
  const durationSeconds = Math.max(0, Math.floor((endTime - sessionStartedAt.value) / 1000))
  return formatSeconds(durationSeconds)
})

function validatePushupCount(value) {
  if (!Number.isInteger(value)) return 'Pushups must be a whole number'
  if (value < 1) return 'Pushups must be at least 1'
  if (value > 1000) return 'Pushups cannot exceed 1000'
  return null
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function setEntryMode(mode) {
  if (isSessionRunning.value && mode !== 'session') {
    stopSession()
  }
  entryMode.value = mode
}

function clearMessageTimeout() {
  if (messageTimeoutId.value) {
    clearTimeout(messageTimeoutId.value)
    messageTimeoutId.value = null
  }
}

function clearMessages() {
  clearMessageTimeout()
  successMessage.value = ''
  errorMessage.value = ''
}

function setTimedSuccess(message, timeoutMs = 3000) {
  clearMessageTimeout()
  successMessage.value = message
  messageTimeoutId.value = setTimeout(() => {
    successMessage.value = ''
    messageTimeoutId.value = null
  }, timeoutMs)
}

function setTimedError(message, timeoutMs = 5000) {
  clearMessageTimeout()
  errorMessage.value = message
  messageTimeoutId.value = setTimeout(() => {
    errorMessage.value = ''
    messageTimeoutId.value = null
  }, timeoutMs)
}

async function submitManualForm() {
  clearMessages()

  if (manualValidationError.value) {
    setTimedError(manualValidationError.value)
    return
  }

  isManualLoading.value = true

  try {
    await axios.post('/api/pushups', {
      count: manualPushupCount.value,
      date: new Date().toISOString().split('T')[0]
    })

    setTimedSuccess(`✅ Logged ${manualPushupCount.value} pushup${manualPushupCount.value !== 1 ? 's' : ''}!`)
    emit('pushups-logged', { count: manualPushupCount.value })
    manualPushupCount.value = 30
  } catch (error) {
    console.error('Error logging pushups:', error)
    setTimedError(getApiErrorMessage(error))
  } finally {
    isManualLoading.value = false
  }
}

async function startSession() {
  clearMessages()

  if (sessionValidationError.value) {
    setTimedError(sessionValidationError.value)
    return
  }

  completedSetReps.value = []
  sessionStartedAt.value = Date.now()
  sessionEndedAt.value = null
  currentSetElapsedSeconds.value = 0
  isSessionRunning.value = true

  await ensureAudioContext()
  await runPrepCountdown()
}

function stopSession() {
  clearSessionTimers()
  isSessionRunning.value = false
  sessionPhase.value = 'stopped'
  sessionCountdownSeconds.value = 0
  sessionEndedAt.value = Date.now()
  if (completedSetCount.value > 0) {
    setTimedSuccess('Session stopped. Nice work.')
  }
}

async function runPrepCountdown() {
  sessionPhase.value = 'prep'
  sessionCountdownSeconds.value = prepCountdownSeconds.value
  startCountdownTimer(() => {
    playGoCue()
    beginActiveSet()
  })
}

function beginActiveSet() {
  sessionPhase.value = 'active'
  sessionCountdownSeconds.value = 0
  currentSetElapsedSeconds.value = 0

  stopSetElapsedTimer()
  elapsedIntervalId.value = setInterval(() => {
    currentSetElapsedSeconds.value += 1
  }, 1000)

  startTickTrack()
}

function startRestPeriod() {
  stopTickTrack()
  stopSetElapsedTimer()
  sessionPhase.value = 'rest'
  sessionCountdownSeconds.value = restCountdownSeconds.value

  startCountdownTimer(() => {
    playGoCue()
    beginActiveSet()
  })
}

function startCountdownTimer(onComplete) {
  stopPhaseTimer()
  phaseIntervalId.value = setInterval(() => {
    sessionCountdownSeconds.value -= 1
    if (sessionCountdownSeconds.value <= 0) {
      stopPhaseTimer()
      onComplete()
    }
  }, 1000)
}

async function logActiveSet() {
  clearMessages()

  if (sessionPhase.value !== 'active') return
  if (sessionValidationError.value) {
    setTimedError(sessionValidationError.value)
    return
  }

  isSessionSubmitting.value = true

  try {
    await axios.post('/api/pushups', {
      count: sessionPushupCount.value,
      date: new Date().toISOString().split('T')[0]
    })

    completedSetReps.value = [...completedSetReps.value, sessionPushupCount.value]
    emit('pushups-logged', { count: sessionPushupCount.value })
    setTimedSuccess(`Set ${completedSetCount.value} logged at ${sessionPushupCount.value} reps.`)
    startRestPeriod()
  } catch (error) {
    console.error('Error logging session set:', error)
    setTimedError(getApiErrorMessage(error))
  } finally {
    isSessionSubmitting.value = false
  }
}

async function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return

  if (!audioContextRef.value) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    audioContextRef.value = new AudioCtx()
  }

  if (audioContextRef.value.state === 'suspended') {
    await audioContextRef.value.resume()
  }
}

function playTone({ frequency, durationSeconds = 0.08, gainValue = 0.04 }) {
  const audioContext = audioContextRef.value
  if (!audioContext) return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  gainNode.gain.setValueAtTime(gainValue, now)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + durationSeconds)
}

function playGoCue() {
  if (!soundEnabled.value) return
  playTone({ frequency: 700, durationSeconds: 0.12, gainValue: 0.06 })
  setTimeout(() => {
    playTone({ frequency: 980, durationSeconds: 0.15, gainValue: 0.06 })
  }, 160)
}

function startTickTrack() {
  if (!soundEnabled.value) return
  stopTickTrack()
  const beatIntervalMs = Math.round(60000 / tickBpm.value)
  tickIntervalId.value = setInterval(() => {
    playTone({ frequency: 420, durationSeconds: 0.05, gainValue: 0.03 })
  }, beatIntervalMs)
}

function stopTickTrack() {
  if (tickIntervalId.value) {
    clearInterval(tickIntervalId.value)
    tickIntervalId.value = null
  }
}

function stopPhaseTimer() {
  if (phaseIntervalId.value) {
    clearInterval(phaseIntervalId.value)
    phaseIntervalId.value = null
  }
}

function stopSetElapsedTimer() {
  if (elapsedIntervalId.value) {
    clearInterval(elapsedIntervalId.value)
    elapsedIntervalId.value = null
  }
}

function clearSessionTimers() {
  stopPhaseTimer()
  stopSetElapsedTimer()
  stopTickTrack()
}

function getApiErrorMessage(error) {
  if (error.response) {
    if (error.response.status === 400) {
      return error.response.data?.message || 'Invalid input'
    }
    if (error.response.status === 500) {
      return 'Server error. Please try again later.'
    }
    return error.response.data?.message || 'Failed to log pushups'
  }
  if (error.request) {
    return 'Network error. Please check your connection.'
  }
  return 'An unexpected error occurred'
}

onBeforeUnmount(() => {
  clearSessionTimers()
  clearMessageTimeout()
  if (audioContextRef.value && audioContextRef.value.state !== 'closed') {
    audioContextRef.value.close()
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
