<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const stats = ref(null)
const loading = ref(true)
const error = ref(null)
const refreshFeedback = ref('')
const refreshFeedbackTimer = ref(null)

const API_URL = '/api/statistics'

const formatNumber = (value) => {
  if (value === null || value === undefined) return 0
  return Math.round(value)
}

const fetchStats = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.get(API_URL)
    stats.value = response.data

    if (!loading.value || stats.value) {
      showRefreshFeedback()
    }
  } catch (err) {
    console.error('Failed to fetch statistics:', err)
    error.value = 'Failed to load statistics. Please try again.'
    stats.value = {
      dailyTotal: { total: 50 },
      sevenDayAverage: { average: 45.2 },
      currentStreak: { currentStreak: 12 },
      thirtyDayAverage: { average: 42.8 },
      allTimeStats: { totalPushups: 5432 },
      avgPerSession: { avgPerSession: 0 },
      avgPerSet: { avgPerSet: 0 },
      lifelinesEarned: 0
    }
  } finally {
    loading.value = false
  }
}

const showRefreshFeedback = () => {
  refreshFeedback.value = '✅ Updated!'

  if (refreshFeedbackTimer.value) {
    clearTimeout(refreshFeedbackTimer.value)
  }

  refreshFeedbackTimer.value = setTimeout(() => {
    refreshFeedback.value = ''
  }, 2000)
}

const refreshStats = async () => {
  if (loading.value) return

  try {
    loading.value = true
    error.value = null
    const response = await axios.get(API_URL)
    stats.value = response.data
    showRefreshFeedback()
  } catch (err) {
    console.error('Failed to refresh statistics:', err)
    error.value = 'Failed to refresh statistics.'

    setTimeout(() => {
      error.value = null
    }, 5000)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})

defineExpose({
  refreshStats
})

onBeforeUnmount(() => {
  if (refreshFeedbackTimer.value) {
    clearTimeout(refreshFeedbackTimer.value)
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Error Message -->
    <div v-if="error" class="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100">
      <p class="font-semibold">⚠️ {{ error }}</p>
      <p class="text-sm mt-2">Showing mock data for development purposes.</p>
    </div>

    <!-- Update Feedback -->
    <div
      v-if="refreshFeedback"
      class="mb-4 p-3 bg-green-900 border border-green-700 rounded-lg text-green-200 text-sm font-semibold text-center animate-pulse"
    >
      {{ refreshFeedback }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="bg-slate-800 rounded-lg p-6 animate-pulse">
        <div class="h-4 bg-slate-700 rounded w-1/3 mb-3"></div>
        <div class="h-8 bg-slate-700 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Stats Grid: 2 Cards -->
    <div v-else-if="stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Averages Card -->
      <div class="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📈 Averages
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center pb-2 border-b border-blue-700">
            <span class="text-blue-200 text-sm">Avg per Set</span>
            <span class="text-white font-semibold">{{ formatNumber(stats.avgPerSet?.avgPerSet ?? 0) }}</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b border-blue-700">
            <span class="text-blue-200 text-sm">Avg per Session</span>
            <span class="text-white font-semibold">{{ formatNumber(stats.avgPerSession?.avgPerSession ?? 0) }}</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b border-blue-700">
            <span class="text-blue-200 text-sm">7-Day Average</span>
            <span class="text-white font-semibold">{{ formatNumber(stats.sevenDayAverage?.average ?? 0) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-blue-200 text-sm">30-Day Average</span>
            <span class="text-white font-semibold">{{ formatNumber(stats.thirtyDayAverage?.average ?? 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Totals Card -->
      <div class="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 shadow-lg border border-purple-700">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🎯 Totals & Streaks
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center pb-2 border-b border-purple-700">
            <span class="text-purple-200 text-sm">Today</span>
            <span class="text-white font-semibold">{{ formatNumber(stats.dailyTotal?.total ?? stats.dailyTotal) }}</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b border-purple-700">
           <span class="text-purple-200 text-sm flex items-center gap-1">
             Current Streak
             <span v-if="stats.currentStreak?.forgivenessUsed" class="text-xs bg-yellow-600 px-2 py-0.5 rounded" title="Streak continued with forgiveness token">💛</span>
           </span>
           <span class="text-white font-semibold">{{ formatNumber(stats.currentStreak?.currentStreak ?? stats.currentStreak) }} days</span>
         </div>
         <div class="flex justify-between items-center pb-2 border-b border-purple-700">
           <span class="text-purple-200 text-sm">Lifelines Earned 🛟</span>
           <span class="text-white font-semibold">{{ formatNumber(stats.lifelinesEarned ?? 0) }}</span>
         </div>
         <div class="flex justify-between items-center">
           <span class="text-purple-200 text-sm">All-Time Total</span>
           <span class="text-white font-semibold">{{ formatNumber(stats.allTimeStats?.totalPushups || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-slate-400">No statistics available yet.</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
