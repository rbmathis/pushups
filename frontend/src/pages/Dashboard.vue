<script setup>
import { ref } from 'vue'
import QuickAddForm from '../components/QuickAddForm.vue'
import StatsDashboard from '../components/StatsDashboard.vue'
import TrendsChart from '../components/TrendsChart.vue'

const statsDashboardRef = ref(null)
const trendsChartRef = ref(null)
const refreshing = ref(false)

const handlePushupsLogged = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  if (statsDashboardRef.value) {
    refreshing.value = true
    await statsDashboardRef.value.refreshStats()
    refreshing.value = false
  }
  if (trendsChartRef.value) { await trendsChartRef.value.refresh() }
}
</script>

<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-3">
        <QuickAddForm @pushups-logged="handlePushupsLogged" />
      </div>
      <div class="lg:col-span-3">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white tracking-tight">Statistics</h2>
          <div v-if="refreshing" class="flex items-center gap-2 text-amber-400 text-sm">
            <span class="inline-block animate-spin">⟳</span><span>Updating...</span>
          </div>
        </div>
        <StatsDashboard ref="statsDashboardRef" />
        <div class="mt-8"><TrendsChart ref="trendsChartRef" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
.animate-spin { animation: spin 1s linear infinite; }
</style>
