<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const chartData = ref(null)
const loading = ref(true)
const error = ref(null)
const totals = ref({ morning: 0, afternoon: 0, evening: 0, night: 0 })

const LABELS = ['Morning (6–11am)', 'Afternoon (12–4pm)', 'Evening (5–8pm)', 'Night (9pm–5am)']
const COLORS = [
  'rgba(251, 191, 36, 0.85)',  // amber  – morning
  'rgba(59, 130, 246, 0.85)',  // blue   – afternoon
  'rgba(168, 85, 247, 0.85)',  // purple – evening
  'rgba(30, 41, 59, 0.9)',     // dark   – night
]
const BORDER_COLORS = [
  'rgb(251, 191, 36)',
  'rgb(59, 130, 246)',
  'rgb(168, 85, 247)',
  'rgb(71, 85, 105)',
]

const buildChartData = (data) => {
  const values = [data.morning, data.afternoon, data.evening, data.night]
  if (values.every(v => v === 0)) return null
  return {
    labels: LABELS,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS,
        borderColor: BORDER_COLORS,
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  }
}

const fetchTimeOfDay = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.get('/api/timeofday')
    totals.value = response.data
    chartData.value = buildChartData(response.data)
    if (!chartData.value) {
      error.value = 'No data yet'
    }
  } catch (err) {
    console.error('Failed to fetch time-of-day data:', err)
    error.value = 'Failed to load chart data.'
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await fetchTimeOfDay()
}

defineExpose({ refresh })

onMounted(() => {
  fetchTimeOfDay()
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#cbd5e1',
        font: { size: 12, weight: '500' },
        padding: 16,
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      borderColor: '#475569',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: function (context) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0
          return ` ${context.parsed} pushups (${pct}%)`
        }
      }
    }
  }
}

// Icon for each block
const blockIcon = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' }
const blockKeys = ['morning', 'afternoon', 'evening', 'night']
const blockLabel = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night'
}
const blockColor = {
  morning: 'text-amber-400',
  afternoon: 'text-blue-400',
  evening: 'text-purple-400',
  night: 'text-slate-400'
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 border border-slate-700">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-white">🕐 Time-of-Day Hotspots</h3>
      <p class="text-sm text-slate-400 mt-1">When you crush the most pushups</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-56">
      <div class="text-center">
        <div class="inline-block animate-spin mb-4">
          <svg class="w-8 h-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p class="text-slate-400">Loading chart...</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!chartData" class="text-center py-10">
      <p class="text-slate-400">No data yet — log some pushups first!</p>
    </div>

    <!-- Chart + summary -->
    <div v-else class="flex flex-col md:flex-row items-center gap-6">
      <!-- Donut -->
      <div class="relative w-56 h-56 flex-shrink-0">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>

      <!-- Block breakdown -->
      <div class="flex-1 grid grid-cols-2 gap-3 w-full">
        <div
          v-for="key in blockKeys"
          :key="key"
          class="bg-slate-700 rounded-lg p-3 flex flex-col gap-1"
        >
          <span class="text-xl">{{ blockIcon[key] }}</span>
          <span class="text-xs text-slate-400">{{ blockLabel[key] }}</span>
          <span :class="['text-2xl font-bold', blockColor[key]]">{{ totals[key].toLocaleString() }}</span>
          <span class="text-xs text-slate-500">pushups</span>
        </div>
      </div>
    </div>
  </div>
</template>
