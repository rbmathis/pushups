<script setup>
import { computed } from 'vue'

const props = defineProps({
  completedSetCount: Number,
  sessionSetTarget: Number,
  totalSessionPushups: Number,
  averageRepsPerSet: Number,
  formattedSessionDuration: String,
})

const progressPercent = computed(() => {
  if (!props.sessionSetTarget) return 0
  return Math.min(100, (props.completedSetCount / props.sessionSetTarget) * 100)
})

const goalStatus = computed(() => {
  if (props.completedSetCount === 0) return 'Not started'
  if (props.completedSetCount < props.sessionSetTarget) return 'In progress'
  return 'Goal reached!'
})

const goalStatusColor = computed(() => {
  if (props.completedSetCount === 0) return 'text-gray-400'
  if (props.completedSetCount < props.sessionSetTarget) return 'text-blue-400'
  return 'text-green-400'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Main Stats Cards -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Total Pushups -->
      <div class="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-700">
        <div class="text-sm text-blue-300 font-medium mb-2">Total Pushups</div>
        <div class="text-4xl font-bold text-white">{{ totalSessionPushups }}</div>
        <div class="text-xs text-blue-300 mt-2">This session</div>
      </div>

      <!-- Sets Completed -->
      <div class="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-700">
        <div class="text-sm text-purple-300 font-medium mb-2">Sets</div>
        <div class="text-4xl font-bold text-white">{{ completedSetCount }}<span class="text-xl text-purple-300">/{{ sessionSetTarget }}</span></div>
        <div class="text-xs text-purple-300 mt-2">{{ completedSetCount }} of {{ sessionSetTarget }} complete</div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-white">Session Progress</h3>
        <span :class="goalStatusColor" class="text-sm font-bold">{{ goalStatus }}</span>
      </div>
      <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <div 
          class="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
      <div class="mt-2 text-xs text-slate-400">{{ Math.round(progressPercent) }}% complete</div>
    </div>

    <!-- Secondary Stats -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Avg Per Set -->
      <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div class="text-xs text-slate-400 font-medium mb-2">Avg per Set</div>
        <div class="text-2xl font-bold text-white">{{ averageRepsPerSet }}</div>
      </div>

      <!-- Duration -->
      <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div class="text-xs text-slate-400 font-medium mb-2">Duration</div>
        <div class="text-2xl font-bold text-white">{{ formattedSessionDuration }}</div>
      </div>
    </div>

    <!-- Set Breakdown (if completed) -->
    <div v-if="completedSetCount > 0" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h4 class="text-sm font-semibold text-white mb-3">Session Summary</h4>
      <div class="space-y-2 text-sm text-slate-300">
        <p>✅ <span class="font-medium">{{ completedSetCount }}</span> sets completed</p>
        <p>💪 <span class="font-medium">{{ totalSessionPushups }}</span> total pushups</p>
        <p>📊 <span class="font-medium">{{ averageRepsPerSet }}</span> average per set</p>
        <p>⏱️ <span class="font-medium">{{ formattedSessionDuration }}</span> total time</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
