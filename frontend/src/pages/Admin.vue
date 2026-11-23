<template>
  <div class="text-white py-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Admin Panel</h1>
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

    // Edit state
    const editingId = ref(null)
    const editForm = ref({ count: 0, date: '', time: '' })
    const isSaving = ref(false)

    // Delete state
    const deletingId = ref(null)

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
      editingId,
      editForm,
      isSaving,
      deletingId,
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
