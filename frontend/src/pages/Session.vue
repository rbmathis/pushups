<script setup>
import { ref } from 'vue'
import PushupForm from '../components/PushupForm.vue'
import StatsDashboard from '../components/StatsDashboard.vue'

const statsDashboardRef = ref(null)
const refreshing = ref(false)

const handlePushupsLogged = async () => {
  // Add a small delay to allow the backend to process the data
  await new Promise(resolve => setTimeout(resolve, 500))

  // Trigger stats refresh
  if (statsDashboardRef.value) {
    refreshing.value = true
    await statsDashboardRef.value.refreshStats()
    refreshing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 py-8">
    <div class="container mx-auto px-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">🏋️ Session Mode</h1>
        <p class="text-gray-400">Structured workout with timed rest periods and progress tracking</p>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Session Form (Left) -->
        <div class="lg:col-span-1">
          <div class="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 shadow-lg border border-slate-600 sticky top-6">
            <PushupForm @pushups-logged="handlePushupsLogged" />
          </div>
        </div>

        <!-- Stats & Analytics (Right) -->
        <div class="lg:col-span-2">
          <div>
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-white">Session Stats</h2>
              <div v-if="refreshing" class="flex items-center gap-2 text-blue-400 text-sm">
                <span class="inline-block animate-spin">⟳</span>
                <span>Updating...</span>
              </div>
            </div>
            <StatsDashboard ref="statsDashboardRef" />
          </div>
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-3">How Session Mode Works</h3>
        <ul class="space-y-2 text-gray-300 text-sm">
          <li class="flex gap-3">
            <span class="text-blue-400 font-bold">1.</span>
            <span>Set your default reps and target number of sets</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-400 font-bold">2.</span>
            <span>Click "Start Session" to begin with a prep countdown</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-400 font-bold">3.</span>
            <span>Perform your set and log it when complete</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-400 font-bold">4.</span>
            <span>Rest with timed countdown (beeps in final 5 seconds)</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-400 font-bold">5.</span>
            <span>Each set is grouped into one session for analytics</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
