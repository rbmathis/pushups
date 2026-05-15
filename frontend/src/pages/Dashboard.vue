<script setup>
import { ref } from 'vue'
import PushupForm from '../components/PushupForm.vue'
import StatsDashboard from '../components/StatsDashboard.vue'
import TrendsChart from '../components/TrendsChart.vue'
import TimeOfDayChart from '../components/TimeOfDayChart.vue'

const statsDashboardRef = ref(null)
const trendsChartRef = ref(null)
const timeOfDayChartRef = ref(null)
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

  // Refresh trends chart
  if (trendsChartRef.value) {
    await trendsChartRef.value.refresh()
  }

  // Refresh time-of-day chart
  if (timeOfDayChartRef.value) {
    await timeOfDayChartRef.value.refresh()
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Entry Form Section -->
    <div class="lg:col-span-1">
      <div
        class="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 shadow-lg border border-slate-600 sticky top-6"
      >
        <PushupForm @pushups-logged="handlePushupsLogged" />
      </div>
    </div>

    <!-- Statistics Dashboard Section -->
    <div class="lg:col-span-2">
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Statistics</h2>
          <div v-if="refreshing" class="flex items-center gap-2 text-blue-400 text-sm">
            <span class="inline-block animate-spin">⟳</span>
            <span>Updating...</span>
          </div>
        </div>
        <StatsDashboard ref="statsDashboardRef" />
      </div>

      <!-- Trends Chart Section -->
      <div class="mt-8">
        <TrendsChart ref="trendsChartRef" />
      </div>

      <!-- Time-of-Day Chart Section -->
      <div class="mt-8">
        <TimeOfDayChart ref="timeOfDayChartRef" />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
