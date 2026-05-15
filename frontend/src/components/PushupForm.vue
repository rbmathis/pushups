<template>
  <div class="w-full max-w-md mx-auto p-6 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
    <!-- Title -->
    <h2 class="text-2xl font-bold text-white mb-6">Log Pushups</h2>

    <!-- Error Message -->
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

    <!-- Success Message -->
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

    <!-- Form -->
    <form @submit.prevent="submitForm" class="space-y-4">
      <!-- Input Group -->
      <div>
        <label
          for="pushup-count"
          class="block text-sm font-medium text-gray-300 mb-2"
        >
          Number of Pushups
        </label>
        <div class="relative">
          <input
            id="pushup-count"
            v-model.number="pushupCount"
            type="number"
            min="1"
            max="1000"
            placeholder="Enter number of pushups"
            aria-label="Number of pushups to log"
            :disabled="isLoading"
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <span class="absolute right-3 top-2.5 text-gray-500 text-sm font-medium">
            💪
          </span>
        </div>
        <!-- Validation Messages -->
        <div v-if="validationError" class="mt-2 text-red-400 text-xs font-medium">
          {{ validationError }}
        </div>
        <div class="mt-2 text-gray-400 text-xs">
          Range: 1 - 1000 pushups
        </div>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading || !!validationError"
        aria-label="Log pushups button"
        class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
      >
        <span v-if="isLoading" class="inline-block animate-spin">⏳</span>
        <span>{{ isLoading ? 'Logging...' : 'Log Pushups' }}</span>
      </button>

      <!-- Hint Text -->
      <p class="text-center text-gray-400 text-xs">
        {{ pushupCount ? `Ready to log ${pushupCount} pushup${pushupCount !== 1 ? 's' : ''}` : 'Enter a number to continue' }}
      </p>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'PushupForm',
  emits: ['pushups-logged'],
  setup(_, { emit }) {
    const pushupCount = ref(30)
    const isLoading = ref(false)
    const successMessage = ref('')
    const errorMessage = ref('')

    // Validation
    const validationError = computed(() => {
      const count = pushupCount.value
      if (count === null || count === '') return null
      if (count < 1) return 'Pushups must be at least 1'
      if (count > 1000) return 'Pushups cannot exceed 1000'
      return null
    })

    // Submit form
    const submitForm = async () => {
      // Clear messages
      successMessage.value = ''
      errorMessage.value = ''

      // Validate
      if (validationError.value) {
        errorMessage.value = validationError.value
        return
      }

      isLoading.value = true

      try {
        const response = await axios.post(
          '/api/pushups',
          {
            count: pushupCount.value,
            date: new Date().toISOString().split('T')[0]
          }
        )

        // Success
        successMessage.value = `✅ Logged ${pushupCount.value} pushup${pushupCount.value !== 1 ? 's' : ''}!`

        // Emit event for parent component
        emit('pushups-logged', { count: pushupCount.value })

        // Reset form after 2 seconds
        setTimeout(() => {
          successMessage.value = ''
          pushupCount.value = 30
        }, 2000)
      } catch (error) {
        console.error('Error logging pushups:', error)

        // Handle different error types
        if (error.response) {
          // Server responded with error status
          if (error.response.status === 400) {
            errorMessage.value = error.response.data?.message || 'Invalid input'
          } else if (error.response.status === 500) {
            errorMessage.value = 'Server error. Please try again later.'
          } else {
            errorMessage.value = error.response.data?.message || 'Failed to log pushups'
          }
        } else if (error.request) {
          // Request made but no response
          errorMessage.value = 'Network error. Please check your connection.'
        } else {
          // Error in request setup
          errorMessage.value = 'An unexpected error occurred'
        }

        // Clear error after 5 seconds
        setTimeout(() => {
          errorMessage.value = ''
        }, 5000)
      } finally {
        isLoading.value = false
      }
    }

    return {
      pushupCount,
      isLoading,
      successMessage,
      errorMessage,
      validationError,
      submitForm
    }
  }
}
</script>

<style scoped>
/* Fade transition for messages */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Smooth color transitions */
input:disabled {
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

button:disabled {
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

/* Animation for loading spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
