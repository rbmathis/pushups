<script setup>
import { ref } from 'vue'
import QuickAddForm from '../components/QuickAddForm.vue'
import SessionLinkBox from '../components/SessionLinkBox.vue'
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

const navigateToSession = () => {
  // Emit custom event to parent (App.vue)
  window.dispatchEvent(new CustomEvent('navigate-to-session'))
}
</script>

<template>
  <div class="space-y-8">
    <!-- Top Section: Stats and Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Statistics Dashboard Section -->
      <div class="lg:col-span-3">
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

    <!-- Bottom Section: Quick Add & Session Link -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <QuickAddForm @pushups-logged="handlePushupsLogged" />
      <SessionLinkBox @click="navigateToSession" />
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
