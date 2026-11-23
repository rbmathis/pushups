<script setup>
import { ref } from 'vue'
import Header from './components/Header.vue'
import Dashboard from './pages/Dashboard.vue'
import Admin from './pages/Admin.vue'

const currentPage = ref('dashboard')
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-x-hidden">
    <!-- Subtle top ambient amber glow -->
    <div
      class="pointer-events-none fixed inset-x-0 top-0 h-80 opacity-60"
      style="background: radial-gradient(ellipse 65% 50% at 20% 0%, rgba(245, 158, 11, 0.16), transparent 70%), radial-gradient(ellipse 50% 45% at 85% 10%, rgba(234, 88, 12, 0.12), transparent 70%);"
    ></div>

    <div class="relative z-10 flex flex-col min-h-screen">
      <!-- Header -->
      <Header />

      <!-- Navigation Buttons -->
      <div class="container mx-auto px-4 pt-4 flex justify-end gap-2">
        <button
          v-if="currentPage === 'dashboard'"
          @click="currentPage = 'admin'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors"
        >
          ⚙️ Admin
        </button>
        <button
          v-if="currentPage !== 'dashboard'"
          @click="currentPage = 'dashboard'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      <!-- Main Content -->
      <main class="container mx-auto px-4 py-4 flex-1">
        <Dashboard v-if="currentPage === 'dashboard'" />
        <Admin v-else-if="currentPage === 'admin'" />
      </main>

      <!-- Footer -->
      <footer class="border-t border-white/10 mt-12 py-6 text-center text-zinc-500 text-sm">
        <p>&copy; 2024 Pushup Tracker. Track your progress, build your strength.</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
</style>
