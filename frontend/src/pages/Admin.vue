<template>
  <div class="text-white py-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Admin Panel</h1>
      </div>

      <!-- Session Settings -->
      <div class="bg-zinc-900/75 rounded-xl p-6 mb-8 border border-white/10 backdrop-blur-md">
        <h2 class="text-xl font-semibold mb-2">Session Controls</h2>
        <p class="text-sm text-gray-400 mb-4">
          Configure defaults for guided sessions on the dashboard.
        </p>
        <form @submit.prevent="saveSessionConfig" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="admin-session-default-reps" class="block text-sm text-gray-400 mb-1">Default Reps</label>
              <input
                id="admin-session-default-reps"
                v-model.number="sessionConfig.defaultReps"
                type="number"
                min="1"
                max="1000"
                required
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="admin-session-set-target" class="block text-sm text-gray-400 mb-1">Set Target</label>
              <input
                id="admin-session-set-target"
                v-model.number="sessionConfig.setTarget"
                type="number"
                min="1"
                max="50"
                required
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="admin-session-prep-seconds" class="block text-sm text-gray-400 mb-1">Prep Countdown (sec)</label>
              <input
                id="admin-session-prep-seconds"
                v-model.number="sessionConfig.prepSeconds"
                type="number"
                min="1"
                max="30"
                required
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="admin-session-rest-seconds" class="block text-sm text-gray-400 mb-1">Rest Timer (sec)</label>
              <input
                id="admin-session-rest-seconds"
                v-model.number="sessionConfig.restSeconds"
                type="number"
                min="5"
                max="300"
                required
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="admin-session-tick-bpm" class="block text-sm text-gray-400 mb-1">Tick Tempo (BPM)</label>
              <input
                id="admin-session-tick-bpm"
                v-model.number="sessionConfig.tickBpm"
                type="number"
                min="30"
                max="200"
                required
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="flex items-end">
              <label class="inline-flex items-center gap-2 text-sm text-gray-300">
                <input
                  id="admin-session-sound-enabled"
                  v-model="sessionConfig.soundEnabled"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                Enable session sounds
              </label>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="isSavingSessionConfig"
              class="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-zinc-700 disabled:to-zinc-700 text-zinc-950 rounded-lg font-bold transition-all"
            >
              {{ isSavingSessionConfig ? 'Saving...' : 'Save Session Settings' }}
            </button>
            <button
              type="button"
              @click="resetSessionConfig"
              :disabled="isSavingSessionConfig"
              class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 border border-white/10 rounded-lg font-semibold transition-colors"
            >
              Reset Defaults
            </button>
          </div>
        </form>
        <p v-if="sessionConfigError" class="mt-2 text-red-400 text-sm">{{ sessionConfigError }}</p>
        <p v-if="sessionConfigSuccess" class="mt-2 text-green-400 text-sm">{{ sessionConfigSuccess }}</p>
      </div>

      <!-- Add New Entry Form -->
      <div class="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
        <h2 class="text-xl font-semibold mb-4">Add New Entry</h2>
        <form @submit.prevent="addEntry" class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Count</label>
            <input
              v-model.number="newEntry.count"
              type="number"
              min="1"
              max="1000"
              required
              class="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Date</label>
            <input
              v-model="newEntry.date"
              type="date"
              required
              class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Time</label>
            <input
              v-model="newEntry.time"
              type="time"
              required
              class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            :disabled="isAdding"
            class="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            {{ isAdding ? 'Adding...' : 'Add Entry' }}
          </button>
        </form>
        <p v-if="addError" class="mt-2 text-red-400 text-sm">{{ addError }}</p>
        <p v-if="addSuccess" class="mt-2 text-green-400 text-sm">{{ addSuccess }}</p>
      </div>

      <!-- Entries Table -->
      <div class="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div class="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 class="text-xl font-semibold">All Entries ({{ entries.length }})</h2>
          <button
            @click="loadEntries"
            :disabled="isLoading"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loadError" class="p-4 bg-red-900/50 text-red-200">
          {{ loadError }}
        </div>

        <div v-if="isLoading" class="p-8 text-center text-gray-400">
          Loading entries...
        </div>

        <table v-else-if="entries.length > 0" class="w-full">
          <thead class="bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">Count</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">Timestamp</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">Created At</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr v-for="entry in entries" :key="entry.id" class="hover:bg-gray-800/50">
              <td class="px-4 py-3 text-gray-400">{{ entry.id }}</td>
              <td class="px-4 py-3">
                <template v-if="editingId === entry.id">
                  <input
                    v-model.number="editForm.count"
                    type="number"
                    min="1"
                    max="1000"
                    class="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </template>
                <template v-else>
                  <span class="font-semibold text-blue-400">{{ entry.count }}</span>
                </template>
              </td>
              <td class="px-4 py-3">
                <template v-if="editingId === entry.id">
                  <div class="flex gap-2">
                    <input
                      v-model="editForm.date"
                      type="date"
                      class="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      v-model="editForm.time"
                      type="time"
                      class="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </template>
                <template v-else>
                  {{ formatTimestamp(entry.timestamp) }}
                </template>
              </td>
              <td class="px-4 py-3 text-gray-400 text-sm">
                {{ formatDate(entry.created_at) }}
              </td>
              <td class="px-4 py-3 text-right">
                <template v-if="editingId === entry.id">
                  <button
                    @click="saveEdit(entry.id)"
                    :disabled="isSaving"
                    class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded mr-2 text-sm transition-colors"
                  >
                    Save
                  </button>
                  <button
                    @click="cancelEdit"
                    class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </template>
                <template v-else>
                  <button
                    @click="startEdit(entry)"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded mr-2 text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    @click="deleteEntryById(entry.id)"
                    :disabled="deletingId === entry.id"
                    class="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-sm transition-colors"
                  >
                    {{ deletingId === entry.id ? '...' : 'Delete' }}
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="p-8 text-center text-gray-400">
          No entries found
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import {
  loadSessionSettings,
  resetSessionSettings,
  saveSessionSettings
} from '../utils/sessionSettings'

export default {
  name: 'AdminPage',
  setup() {
    const entries = ref([])
    const isLoading = ref(false)
    const loadError = ref('')

    // New entry form
    const newEntry = ref({
      count: 30,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5)
    })
    const isAdding = ref(false)
    const addError = ref('')
    const addSuccess = ref('')
    const sessionConfig = ref(loadSessionSettings())
    const isSavingSessionConfig = ref(false)
    const sessionConfigError = ref('')
    const sessionConfigSuccess = ref('')

    // Edit state
    const editingId = ref(null)
    const editForm = ref({ count: 0, date: '', time: '' })
    const isSaving = ref(false)

    // Delete state
    const deletingId = ref(null)

    const validateSessionConfig = (config) => {
      if (!Number.isInteger(config.defaultReps) || config.defaultReps < 1 || config.defaultReps > 1000) {
        return 'Default reps must be between 1 and 1000'
      }
      if (!Number.isInteger(config.setTarget) || config.setTarget < 1 || config.setTarget > 50) {
        return 'Set target must be between 1 and 50'
      }
      if (!Number.isInteger(config.prepSeconds) || config.prepSeconds < 1 || config.prepSeconds > 30) {
        return 'Prep countdown must be between 1 and 30 seconds'
      }
      if (!Number.isInteger(config.restSeconds) || config.restSeconds < 5 || config.restSeconds > 300) {
        return 'Rest timer must be between 5 and 300 seconds'
      }
      if (!Number.isInteger(config.tickBpm) || config.tickBpm < 30 || config.tickBpm > 200) {
        return 'Tick tempo must be between 30 and 200 BPM'
      }
      return ''
    }

    const saveSessionConfig = async () => {
      sessionConfigError.value = ''
      sessionConfigSuccess.value = ''

      const validationError = validateSessionConfig(sessionConfig.value)
      if (validationError) {
        sessionConfigError.value = validationError
        return
      }

      isSavingSessionConfig.value = true
      try {
        sessionConfig.value = saveSessionSettings(sessionConfig.value)
        sessionConfigSuccess.value = 'Session settings saved.'
      } catch (error) {
        sessionConfigError.value = 'Failed to save session settings'
      } finally {
        isSavingSessionConfig.value = false
      }
    }

    const resetSessionConfig = () => {
      sessionConfigError.value = ''
      sessionConfigSuccess.value = ''
      sessionConfig.value = resetSessionSettings()
      sessionConfigSuccess.value = 'Session settings reset to defaults.'
    }

    const loadEntries = async () => {
      isLoading.value = true
      loadError.value = ''
      try {
        const response = await axios.get('/api/admin/entries')
        entries.value = response.data.entries
      } catch (error) {
        loadError.value = error.response?.data?.error || 'Failed to load entries'
      } finally {
        isLoading.value = false
      }
    }

    const addEntry = async () => {
      isAdding.value = true
      addError.value = ''
      addSuccess.value = ''
      try {
        const timestamp = `${newEntry.value.date}T${newEntry.value.time}:00`
        await axios.post('/api/admin/entries', {
          count: newEntry.value.count,
          timestamp
        })
        addSuccess.value = 'Entry added successfully!'
        await loadEntries()
        // Reset time to current
        newEntry.value.time = new Date().toTimeString().slice(0, 5)
        setTimeout(() => { addSuccess.value = '' }, 3000)
      } catch (error) {
        addError.value = error.response?.data?.details || error.response?.data?.error || 'Failed to add entry'
      } finally {
        isAdding.value = false
      }
    }

    const startEdit = (entry) => {
      editingId.value = entry.id
      const [date, time] = entry.timestamp.split('T')
      editForm.value = {
        count: entry.count,
        date,
        time: time?.slice(0, 5) || '12:00'
      }
    }

    const cancelEdit = () => {
      editingId.value = null
      editForm.value = { count: 0, date: '', time: '' }
    }

    const saveEdit = async (id) => {
      isSaving.value = true
      try {
        const timestamp = `${editForm.value.date}T${editForm.value.time}:00`
        await axios.put(`/api/admin/entries/${id}`, {
          count: editForm.value.count,
          timestamp
        })
        await loadEntries()
        cancelEdit()
      } catch (error) {
        alert(error.response?.data?.details || error.response?.data?.error || 'Failed to update entry')
      } finally {
        isSaving.value = false
      }
    }

    const deleteEntryById = async (id) => {
      if (!confirm('Are you sure you want to delete this entry?')) return
      
      deletingId.value = id
      try {
        await axios.delete(`/api/admin/entries/${id}`)
        await loadEntries()
      } catch (error) {
        alert(error.response?.data?.details || error.response?.data?.error || 'Failed to delete entry')
      } finally {
        deletingId.value = null
      }
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '-'
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    onMounted(() => {
      sessionConfig.value = loadSessionSettings()
      loadEntries()
    })

    return {
      entries,
      isLoading,
      loadError,
      newEntry,
      isAdding,
      addError,
      addSuccess,
      sessionConfig,
      isSavingSessionConfig,
      sessionConfigError,
      sessionConfigSuccess,
      editingId,
      editForm,
      isSaving,
      deletingId,
      saveSessionConfig,
      resetSessionConfig,
      loadEntries,
      addEntry,
      startEdit,
      cancelEdit,
      saveEdit,
      deleteEntryById,
      formatTimestamp,
      formatDate
    }
  }
}
</script>
