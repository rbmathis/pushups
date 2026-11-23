<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'

const emit = defineEmits(['pushups-logged'])

const manualPushupCount = ref(30)
const presetCounts = [10, 20, 30, 50]
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const messageTimeoutId = ref(null)

const manualValidationError = computed(() => {
  if (!Number.isInteger(manualPushupCount.value)) return 'Pushups must be a whole number'
  if (manualPushupCount.value < 1) return 'Pushups must be at least 1'
  if (manualPushupCount.value > 1000) return 'Pushups cannot exceed 1000'
  return null
})

function clearMessageTimeout() {
  if (messageTimeoutId.value) {
    clearTimeout(messageTimeoutId.value)
    messageTimeoutId.value = null
  }
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

async function submitForm() {
  if (manualValidationError.value) {
    setTimedError(manualValidationError.value)
    return
  }

  isLoading.value = true
  try {
    await axios.post('/api/pushups', {
      count: manualPushupCount.value,
    })
    setTimedSuccess(`✅ Logged ${manualPushupCount.value} pushup${manualPushupCount.value !== 1 ? 's' : ''}!`)
    emit('pushups-logged', { count: manualPushupCount.value })
    manualPushupCount.value = 30
  } catch (error) {
    console.error('Error logging pushups:', error)
    setTimedError(getApiErrorMessage(error))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-gradient-to-br from-amber-500/15 via-zinc-900/90 to-zinc-900 rounded-2xl p-6 shadow-xl border border-amber-500/30 backdrop-blur-md">
    <transition name="fade">
      <div
        v-if="errorMessage"
        class="mb-4 p-3 bg-red-950/90 border border-red-700/70 rounded-xl text-red-200 text-sm"
      >
        {{ errorMessage }}
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="successMessage"
        class="mb-4 p-3 bg-emerald-950/90 border border-emerald-700/70 rounded-xl text-emerald-200 text-sm"
      >
        {{ successMessage }}
      </div>
    </transition>

    <form @submit.prevent="submitForm" class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
            ⚡ Quick Add
          </span>
          <span class="text-xs text-zinc-400">
            {{ manualPushupCount ? `Ready to log ${manualPushupCount} pushup${manualPushupCount !== 1 ? 's' : ''}` : 'Enter a number' }}
          </span>
        </div>
        <h3 class="text-lg font-bold text-white">How many pushups did you just crush?</h3>
        <div v-if="manualValidationError" class="text-red-400 text-xs font-medium pt-0.5">
          {{ manualValidationError }}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <!-- Preset chips -->
        <div class="flex items-center gap-1.5">
          <button
            v-for="preset in presetCounts"
            :key="preset"
            type="button"
            :disabled="isLoading"
            @click="manualPushupCount = preset"
            class="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
            :class="manualPushupCount === preset
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
              : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'"
          >
            +{{ preset }}
          </button>
        </div>

        <!-- Number input + Submit -->
        <div class="flex items-center gap-2.5">
          <label for="pushup-count" class="sr-only">Number of Pushups</label>
          <div class="relative flex-1 sm:flex-none">
            <input
              id="pushup-count"
              v-model.number="manualPushupCount"
              type="number"
              min="1"
              max="1000"
              placeholder="30"
              :disabled="isLoading"
              class="w-full sm:w-24 px-3.5 py-2.5 bg-zinc-950/80 border border-white/15 rounded-xl text-center font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading || !!manualValidationError"
            class="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap"
          >
            <span v-if="isLoading" class="inline-block animate-spin mr-1.5">⏳</span>
            {{ isLoading ? 'Logging...' : 'Log Pushups' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

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
