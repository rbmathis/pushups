<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const chartData = ref(null)
const loading = ref(true)
const error = ref(null)

const API_URL = '/api/history'

/**
 * Format a date string (YYYY-MM-DD) to a readable format (Mon Apr 20)
 */
const formatDateLabel = (dateString) => {
  try {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * Generate an array of YYYY-MM-DD strings for the last `days` days (inclusive of today)
 */
const buildDateRange = (days) => {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

/**
 * Compute a linear regression trendline over y values.
 * Returns an array of trendline y-values (same length as ys).
 */
const linearTrendline = (ys) => {
  const n = ys.length
  if (n < 2) return ys.slice()
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += ys[i]
    sumXY += i * ys[i]
    sumXX += i * i
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return ys.map((_, i) => Math.max(0, Math.round((slope * i + intercept) * 10) / 10))
}

/**
 * Process history data and create chart dataset
 */
const processHistoryData = (history) => {
  // Build a full 30-day date range, filling missing days with 0
  const dateRange = buildDateRange(30)
  const historyMap = {}
  if (history && history.length > 0) {
    history.forEach(item => { historyMap[item.date] = item.total })
  }

  const labels = dateRange.map(d => formatDateLabel(d))
  const data = dateRange.map(d => historyMap[d] ?? 0)

  // Only show chart if there's at least one day with pushups
  if (data.every(v => v === 0)) {
    return null
  }

  const trendData = linearTrendline(data)

  return {
    labels,
    datasets: [
      {
        label: 'Daily Total',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(147, 197, 253, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#1e293b',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(96, 165, 250)',
        pointHoverBorderColor: '#0f172a'
      },
      {
        label: 'Trend',
        data: trendData,
        borderColor: 'rgba(251, 146, 60, 0.85)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0
      }
    ]
  }
}

/**
 * Fetch history data from API
 */
const fetchHistory = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await axios.get(API_URL, {
      params: {
        days: 30
      }
    })

    const processedData = processHistoryData(response.data)
    if (processedData) {
      chartData.value = processedData
    } else {
      error.value = 'No data available for the last 30 days'
    }
  } catch (err) {
    console.error('Failed to fetch history:', err)
    error.value = 'Failed to load chart data. Please try again.'
    // Provide mock data for development
    const mockHistory = [
      { date: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 32 },
      { date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 45 },
      { date: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 38 },
      { date: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 50 },
      { date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 42 },
      { date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 48 },
      { date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 55 },
      { date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 46 },
      { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 51 },
      { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 44 },
      { date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 52 },
      { date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 49 },
      { date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 47 },
      { date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 53 },
      { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 50 },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 48 },
      { date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 54 },
      { date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 51 },
      { date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 46 },
      { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 49 },
      { date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 52 },
      { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 47 },
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 50 },
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 53 },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 48 },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 51 },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 54 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 49 },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], total: 55 },
      { date: new Date().toISOString().split('T')[0], total: 50 }
    ]
    chartData.value = processHistoryData(mockHistory)
  } finally {
    loading.value = false
  }
}

// Expose refresh method for parent component
const refresh = async () => {
  await fetchHistory()
}

defineExpose({
  refresh
})

// Fetch data on mount
onMounted(() => {
  fetchHistory()
})

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: '#cbd5e1',
        font: {
          size: 12,
          weight: '500'
        },
        padding: 15,
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
      displayColors: false,
      callbacks: {
        label: function (context) {
          if (context.dataset.label === 'Trend') {
            return 'Trend: ' + context.parsed.y + ' pushups'
          }
          return context.parsed.y + ' pushups'
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(71, 85, 105, 0.1)',
        drawBorder: false
      },
      ticks: {
        color: '#94a3b8',
        font: {
          size: 11
        },
        maxRotation: 45,
        minRotation: 0
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(71, 85, 105, 0.1)',
        drawBorder: false
      },
      ticks: {
        color: '#94a3b8',
        font: {
          size: 11
        }
      }
    }
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Error Message -->
    <div
      v-if="error"
      class="mb-4 p-4 bg-amber-900 border border-amber-700 rounded-lg text-amber-100"
    >
      <p class="text-sm">⚠️ {{ error }}</p>
      <p class="text-xs mt-2">Displaying mock data for development purposes.</p>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-slate-800 rounded-lg p-6 border border-slate-700"
    >
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="inline-block animate-spin mb-4">
            <svg
              class="w-8 h-8 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p class="text-slate-400">Loading chart...</p>
        </div>
      </div>
    </div>

    <!-- Chart Container -->
    <div
      v-else-if="chartData"
      class="bg-slate-800 rounded-lg p-6 border border-slate-700"
    >
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-white">
          📈 30-Day Trend
        </h3>
        <p class="text-sm text-slate-400 mt-1">Daily pushup totals over the last 30 days</p>
      </div>

      <!-- Chart -->
      <div class="relative h-64">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
      <p class="text-slate-400">No data available yet.</p>
      <p class="text-sm text-slate-500 mt-2">Start logging pushups to see your trend!</p>
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
