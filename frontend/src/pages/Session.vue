<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PushupForm from '../components/PushupForm.vue'
import SessionStats from '../components/SessionStats.vue'

const pushupFormRef = ref(null)

// Local state for stats
const completedSetCount = ref(0)
const sessionSetTarget = ref(0)
const totalSessionPushups = ref(0)
const averageRepsPerSet = ref(0)
const formattedSessionDuration = ref('00:00')

const handlePushupsLogged = async () => {
  // Stats will update via watchers automatically
}

// Watch for changes in form component and update local state
const updateStatsFromForm = () => {
  if (pushupFormRef.value) {
    completedSetCount.value = pushupFormRef.value.completedSetCount
    sessionSetTarget.value = pushupFormRef.value.sessionSetTarget
    totalSessionPushups.value = pushupFormRef.value.totalSessionPushups
    averageRepsPerSet.value = pushupFormRef.value.averageRepsPerSet
    formattedSessionDuration.value = pushupFormRef.value.formattedSessionDuration
  }
}

// Set up a timer to poll form state every second
let updateInterval = null
const startPolling = () => {
  updateInterval = setInterval(updateStatsFromForm, 1000)
}
const stopPolling = () => {
  if (updateInterval) clearInterval(updateInterval)
}

// Start polling on mount
onMounted(() => {
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="py-4">
    <div>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">🏋️ Session Mode</h1>
        <p class="text-zinc-400">Structured workout with timed rest periods and progress tracking</p>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Session Form (Left) -->
        <div class="lg:col-span-1">
          <div class="bg-zinc-900/80 rounded-2xl p-6 shadow-xl border border-amber-500/25 backdrop-blur-md sticky top-6">
            <PushupForm 
              ref="pushupFormRef"
              session-only 
              @pushups-logged="handlePushupsLogged" 
            />
          </div>
        </div>

        <!-- Session Stats (Right) -->
        <div class="lg:col-span-2">
          <SessionStats 
            :completed-set-count="pushupFormRef?.completedSetCount ?? 0"
            :session-set-target="pushupFormRef?.sessionSetTarget ?? 0"
            :total-session-pushups="pushupFormRef?.totalSessionPushups ?? 0"
            :average-reps-per-set="pushupFormRef?.averageRepsPerSet ?? 0"
            :formatted-session-duration="pushupFormRef?.formattedSessionDuration ?? '00:00'"
          />
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-12 bg-zinc-900/75 border border-white/10 rounded-xl p-6 backdrop-blur-md">
        <h3 class="text-lg font-semibold text-white mb-3">How Session Mode Works</h3>
        <ul class="space-y-2 text-zinc-300 text-sm">
          <li class="flex gap-3">
            <span class="text-amber-400 font-bold">1.</span>
            <span>Set your default reps and target number of sets</span>
          </li>
          <li class="flex gap-3">
            <span class="text-amber-400 font-bold">2.</span>
            <span>Click "Start Session" to begin with a prep countdown</span>
          </li>
          <li class="flex gap-3">
            <span class="text-amber-400 font-bold">3.</span>
            <span>Perform your set and log it when complete</span>
          </li>
          <li class="flex gap-3">
            <span class="text-amber-400 font-bold">4.</span>
            <span>Rest with timed countdown (beeps in final 5 seconds)</span>
          </li>
          <li class="flex gap-3">
            <span class="text-amber-400 font-bold">5.</span>
            <span>Watch progress update in real-time above</span>
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
