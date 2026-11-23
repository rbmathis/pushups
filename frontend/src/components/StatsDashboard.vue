<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const stats = ref(null)
const loading = ref(true)
const error = ref(null)
const refreshFeedback = ref('')
const refreshFeedbackTimer = ref(null)

const API_URL = '/api/dailycards'

const formatNumber = (value) => {
  if (value === null || value === undefined) return 0
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })
}

const amPercent = (totals) => {
  const am = Number(totals?.am) || 0
  const pm = Number(totals?.pm) || 0
  const sum = am + pm
  if (sum === 0) return 50
  return Math.round((am / sum) * 100)
}

const pmPercent = (totals) => 100 - amPercent(totals)

const formatShortDate = (dateString) => {
  try {
    return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })
  } catch {
    return dateString
  }
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
      averages: { perDay: 12, perWeekSun: 84, perActiveDay: 30, perMonth: 12, perMonthLabel: 'May 2026' },
      totals: { allTime: 5432, daysOn: 42, daysOff: 32, am: 3000, pm: 2432 },
      today: { total: 50, sinceLastDayOff: 140, runDays: 3 },
      bestDay: { total: 160, date: '2026-05-05' },
      bestWeek: { total: 847, label: 'May 3 – May 9' },
      milestones: { last: 5000, next: 10000, progress: 8 }
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
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-zinc-900/70 border border-white/10 rounded-xl p-5 animate-pulse">
        <div class="h-4 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div class="h-7 bg-zinc-800 rounded w-1/2 mb-3"></div>
        <div class="h-4 bg-zinc-800 rounded w-2/3"></div>
      </div>
    </div>

    <!-- Stat Cards: Today / Totals / Averages / Highlights -->
    <div v-else-if="stats" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <!-- Today (Hero Card) -->
      <div class="bg-zinc-900/80 border border-amber-500/35 rounded-xl p-5 shadow-lg shadow-amber-500/5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-amber-400 text-xs font-semibold uppercase tracking-wider">Today</h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 font-medium">
              🔥 {{ formatNumber(stats.today?.runDays) }}d streak
            </span>
          </div>
          <div class="mb-4">
            <div class="text-4xl font-extrabold tracking-tight text-white">
              {{ formatNumber(stats.today?.total) }}
            </div>
            <div class="text-xs text-zinc-400 mt-0.5">pushups logged today</div>
          </div>
        </div>
        <div class="pt-3 border-t border-white/10 flex justify-between items-baseline text-sm">
          <span class="text-zinc-400 text-xs">Since last day off</span>
          <span class="text-white font-semibold">{{ formatNumber(stats.today?.sinceLastDayOff) }}</span>
        </div>
      </div>

      <!-- Totals -->
      <div class="bg-zinc-900/75 border border-white/10 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-amber-400 text-xs font-semibold uppercase tracking-wider">Totals</h3>
            <span class="text-xs text-zinc-500">All time</span>
          </div>
          <div class="text-3xl font-extrabold tracking-tight text-white mb-4">
            {{ formatNumber(stats.totals?.allTime) }}
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-zinc-400">AM / PM</span>
              <span class="text-zinc-200 font-medium">
                {{ formatNumber(stats.totals?.am) }} / {{ formatNumber(stats.totals?.pm) }}
              </span>
            </div>
            <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
              <div class="h-full bg-amber-400" :style="{ width: amPercent(stats.totals) + '%' }"></div>
              <div class="h-full bg-orange-600/70" :style="{ width: pmPercent(stats.totals) + '%' }"></div>
            </div>
          </div>
          <div class="flex justify-between text-xs pt-1 border-t border-white/10">
            <span class="text-emerald-400 font-semibold">{{ formatNumber(stats.totals?.daysOn) }} days on</span>
            <span class="text-rose-400 font-semibold">{{ formatNumber(stats.totals?.daysOff) }} days off</span>
          </div>
        </div>
      </div>

      <!-- Averages -->
      <div class="bg-zinc-900/75 border border-white/10 rounded-xl p-5 backdrop-blur-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-amber-400 text-xs font-semibold uppercase tracking-wider">Averages</h3>
          <span class="text-xs text-zinc-500">{{ stats.averages?.perMonthLabel || '—' }}</span>
        </div>
        <dl class="space-y-2.5 text-sm">
          <div class="flex justify-between items-baseline">
            <dt class="text-zinc-400 text-xs">Active Day</dt>
            <dd class="text-lg font-bold text-white">{{ formatNumber(stats.averages?.perActiveDay) }}</dd>
          </div>
          <div class="flex justify-between items-baseline">
            <dt class="text-zinc-400 text-xs">Per Day</dt>
            <dd class="text-white font-semibold">{{ formatNumber(stats.averages?.perDay) }}</dd>
          </div>
          <div class="flex justify-between items-baseline">
            <dt class="text-zinc-400 text-xs">Per Week (Sun–Sun)</dt>
            <dd class="text-white font-semibold">{{ formatNumber(stats.averages?.perWeekSun) }}</dd>
          </div>
          <div class="flex justify-between items-baseline">
            <dt class="text-zinc-400 text-xs">Per Month</dt>
            <dd class="text-white font-semibold">{{ formatNumber(stats.averages?.perMonth) }}</dd>
          </div>
        </dl>
      </div>

      <!-- Highlights -->
      <div class="bg-zinc-900/75 border border-white/10 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-amber-400 text-xs font-semibold uppercase tracking-wider">Highlights</h3>
            <span class="text-xs">🏆</span>
          </div>
          <dl class="space-y-2 text-sm mb-4">
            <div class="flex justify-between items-baseline">
              <dt class="text-zinc-400 text-xs">Best Day</dt>
              <dd class="text-white font-semibold">
                {{ formatNumber(stats.bestDay?.total) }}
                <span class="text-xs text-zinc-400">({{ stats.bestDay ? formatShortDate(stats.bestDay.date) : '—' }})</span>
              </dd>
            </div>
            <div class="flex justify-between items-baseline">
              <dt class="text-zinc-400 text-xs">Best Week</dt>
              <dd class="text-white font-semibold">
                {{ formatNumber(stats.bestWeek?.total) }}
                <span class="text-xs text-zinc-400">({{ stats.bestWeek?.label || '—' }})</span>
              </dd>
            </div>
          </dl>
        </div>
        <div v-if="stats.milestones?.progress !== null && stats.milestones?.progress !== undefined" class="pt-3 border-t border-white/10">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-zinc-400">
              Next: <strong class="text-white">{{ formatNumber(stats.milestones?.next) || '—' }}</strong>
            </span>
            <span class="text-amber-400 font-bold">{{ stats.milestones.progress }}%</span>
          </div>
          <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
              :style="{ width: stats.milestones.progress + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-zinc-400">No statistics available yet.</p>
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
