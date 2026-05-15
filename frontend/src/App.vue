<script setup>
import { ref } from 'vue'
import Header from './components/Header.vue'
import Dashboard from './pages/Dashboard.vue'
import Admin from './pages/Admin.vue'

const currentPage = ref('dashboard')
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
    <!-- Header -->
    <Header />

    <!-- Admin Link -->
    <div class="container mx-auto px-4 pt-4 flex justify-end">
      <button
        v-if="currentPage === 'dashboard'"
        @click="currentPage = 'admin'"
        class="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ⚙️ Admin
      </button>
      <button
        v-else
        @click="currentPage = 'dashboard'"
        class="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Dashboard
      </button>
    </div>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-4">
      <Dashboard v-if="currentPage === 'dashboard'" />
      <Admin v-else-if="currentPage === 'admin'" />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-700 mt-12 py-6 text-center text-slate-400 text-sm">
      <p>&copy; 2024 Pushup Tracker. Track your progress, build your strength.</p>
    </footer>
  </div>
</template>

<style scoped>
</style>
