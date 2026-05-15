<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '📊'
  }
})

const displayValue = ref(props.value)
const isUpdating = ref(false)

watch(() => props.value, (newValue) => {
  if (newValue !== displayValue.value) {
    isUpdating.value = true
    displayValue.value = newValue
    
    // Brief visual feedback - fade out then back in
    setTimeout(() => {
      isUpdating.value = false
    }, 300)
  }
})
</script>

<template>
  <div
    class="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 shadow-lg border border-slate-600 hover:border-blue-500 transition-all duration-300"
    :class="{ 'ring-2 ring-green-400': isUpdating }"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
          {{ title }}
        </p>
        <div class="flex items-baseline gap-2">
          <p
            class="text-3xl md:text-4xl font-bold text-white transition-all duration-300"
            :class="{ 'text-green-400 scale-110': isUpdating }"
          >
            {{ displayValue }}
          </p>
          <span v-if="unit" class="text-slate-300 text-sm">{{ unit }}</span>
        </div>
      </div>
      <div class="text-4xl opacity-30">{{ icon }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for stat updates */
p {
  transition: color 0.3s ease, transform 0.3s ease;
}

div {
  transition: border-color 0.3s ease;
}
</style>
