<script setup>
import { ref } from 'vue'

defineProps({
  onNavigate: Function
})

const hovered = ref(false)
</script>

<template>
  <div 
    @click="onNavigate"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    class="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 shadow-lg border border-purple-700 cursor-pointer transition-all hover:shadow-xl hover:from-purple-800 hover:to-purple-700"
  >
    <div class="flex flex-col items-center justify-center text-center space-y-3 h-full min-h-48">
      <div class="text-5xl">🏋️</div>
      <h3 class="text-2xl font-bold text-white">Session Mode</h3>
      <p class="text-purple-200 text-sm">
        Structured workouts with timed rest periods
      </p>
      <div class="mt-4 px-4 py-2 bg-purple-600 rounded-lg text-white font-semibold text-sm hover:bg-purple-500 transition-colors">
        Start Session →
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
