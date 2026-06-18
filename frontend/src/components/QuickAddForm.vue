<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'

const emit = defineEmits(['pushups-logged'])

const manualPushupCount = ref(30)
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
  <div class="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
    <h3 class="text-xl font-bold text-white mb-4">⚡ Quick Add</h3>

    <transition name="fade">
      <div
        v-if="errorMessage"
        class="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-100 text-sm"
      >
        {{ errorMessage }}
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="successMessage"
        class="mb-4 p-3 bg-green-900 border border-green-700 rounded-lg text-green-100 text-sm"
      >
        {{ successMessage }}
      </div>
    </transition>

    <form @submit.prevent="submitForm" class="space-y-3">
      <div>
        <label for="pushup-count" class="block text-sm font-medium text-blue-100 mb-2">
          Number of Pushups
        </label>
        <div class="relative">
          <input
            id="pushup-count"
            v-model.number="manualPushupCount"
            type="number"
            min="1"
            max="1000"
            placeholder="Enter number"
            :disabled="isLoading"
            class="w-full px-4 py-2 bg-blue-950 border border-blue-600 rounded-lg text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
          />
          <span class="absolute right-3 top-2.5 text-blue-400 font-medium">💪</span>
        </div>
        <div v-if="manualValidationError" class="mt-2 text-red-300 text-xs font-medium">
          {{ manualValidationError }}
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading || !!manualValidationError"
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⏳</span>
        {{ isLoading ? 'Logging...' : 'Log Pushups' }}
      </button>

      <p class="text-center text-blue-200 text-xs">
        {{ manualPushupCount ? `Ready to log ${manualPushupCount} pushup${manualPushupCount !== 1 ? 's' : ''}` : 'Enter a number' }}
      </p>
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
