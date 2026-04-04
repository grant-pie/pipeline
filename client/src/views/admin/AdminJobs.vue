<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Jobs</h1>
      <span class="total-label" v-if="total > 0">{{ total }} total</span>
    </div>

    <div class="toolbar">
      <input
        v-model="searchInput"
        type="search"
        class="search-input"
        placeholder="Search by, title or owner..."
      />
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>
    <div v-else-if="jobs.length === 0" class="state-msg">No jobs found.</div>

    <template v-else>
      <p v-if="actionError" class="action-error">{{ actionError }}</p>

      <table class="data-table">
        <thead>
          <tr>
            <th class="cell-check">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="toggleAll"
              />
            </th>
            <th @click="setSort('company')" class="sortable">
              Company <span class="sort-icon">{{ sortIcon('company') }}</span>
            </th>
            <th @click="setSort('title')" class="sortable">
              Title <span class="sort-icon">{{ sortIcon('title') }}</span>
            </th>
            <th @click="setSort('status')" class="sortable">
              Status <span class="sort-icon">{{ sortIcon('status') }}</span>
            </th>
            <th>Owner</th>
            <th @click="setSort('dateApplied')" class="sortable">
              Applied <span class="sort-icon">{{ sortIcon('dateApplied') }}</span>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id">
            <td class="cell-check">
              <input type="checkbox" :value="job.id" v-model="selected" />
            </td>
            <td>{{ job.company }}</td>
            <td class="cell-muted">{{ job.title }}</td>
            <td>
              <span class="status-pill" :class="`status-${job.status}`">{{ job.status }}</span>
            </td>
            <td class="cell-muted">{{ job.user?.email ?? '—' }}</td>
            <td class="cell-muted">{{ formatDate(job.dateApplied) }}</td>
            <td class="cell-actions">
              <RouterLink :to="{ name: 'admin-job-detail', params: { id: job.id } }" class="btn-ghost btn-sm">
                View
              </RouterLink>
              <button class="btn-danger btn-sm" @click="handleDelete(job.id)" :disabled="deleting === job.id">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer">
        <div class="bulk-actions" v-if="selected.length > 0">
          <span class="selected-count">{{ selected.length }} selected</span>
          <button class="btn-danger btn-sm" @click="handleBulkDelete" :disabled="bulkDeleting">
            {{ bulkDeleting ? 'Deleting…' : `Delete selected` }}
          </button>
          <button class="btn-ghost btn-sm" @click="selected = []">Clear</button>
        </div>

        <div class="pagination">
          <button class="btn-ghost btn-sm" :disabled="page === 1" @click="prev">← Prev</button>
          <span class="page-info">Page {{ page }}</span>
          <button class="btn-ghost btn-sm" :disabled="!hasMore" @click="next">Next →</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { adminApi, type AdminJob } from '@/api/admin';

const jobs = ref<AdminJob[]>([]);
const loading = ref(true);
const error = ref('');
const actionError = ref('');
const page = ref(1);
const hasMore = ref(false);
const total = ref(0);
const searchInput = ref('');
const selected = ref<string[]>([]);
const deleting = ref<string | null>(null);
const bulkDeleting = ref(false);
const sortBy = ref('createdAt');
const sortOrder = ref<'ASC' | 'DESC'>('DESC');

const allSelected = computed(() => jobs.value.length > 0 && jobs.value.every(j => selected.value.includes(j.id)));
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value);

function toggleAll() {
  if (allSelected.value) {
    selected.value = [];
  } else {
    selected.value = jobs.value.map(j => j.id);
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  loading.value = true;
  error.value = '';
  selected.value = [];
  try {
    const res = await adminApi.listJobs(
      page.value, 20,
      searchInput.value.trim() || undefined,
      undefined,
      sortBy.value,
      sortOrder.value,
    );
    jobs.value = res.data;
    total.value = res.total;
    hasMore.value = res.hasMore;
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load jobs.';
  } finally {
    loading.value = false;
  }
}

watch(searchInput, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, 300);
});

function setSort(col: string) {
  if (sortBy.value === col) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC';
  } else {
    sortBy.value = col;
    sortOrder.value = 'ASC';
  }
  page.value = 1;
  load();
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return '↕';
  return sortOrder.value === 'ASC' ? '↑' : '↓';
}

function prev() { page.value--; load(); }
function next() { page.value++; load(); }

async function handleDelete(id: string) {
  if (!confirm('Delete this job?')) return;
  actionError.value = '';
  deleting.value = id;
  try {
    await adminApi.deleteJob(id);
    jobs.value = jobs.value.filter(j => j.id !== id);
    total.value--;
  } catch (e) {
    actionError.value = (e as Error).message || 'Failed to delete job.';
  } finally {
    deleting.value = null;
  }
}

async function handleBulkDelete() {
  if (!confirm(`Delete ${selected.value.length} job(s)?`)) return;
  actionError.value = '';
  bulkDeleting.value = true;
  try {
    await adminApi.bulkDeleteJobs(selected.value);
    const removed = new Set(selected.value);
    jobs.value = jobs.value.filter(j => !removed.has(j.id));
    total.value -= removed.size;
    selected.value = [];
  } catch (e) {
    actionError.value = (e as Error).message || 'Failed to delete jobs.';
  } finally {
    bulkDeleting.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

onMounted(load);
</script>

<style scoped>
.toolbar { margin-bottom: 24px; }

.search-input {
  max-width: 300px;
  padding: 7px 12px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  outline: none;
  width: 100%;
}

.search-input:focus { border-color: var(--accent); }

.total-label { font-size: 13px; color: var(--text-muted); }

.sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.sortable:hover { color: var(--text); }

.sort-icon {
  display: inline-block;
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.6;
}

.action-error {
  color: var(--danger);
  font-size: 13px;
  margin-bottom: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 8px 12px;
  color: var(--text-muted);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--surface); }

.cell-check { width: 32px; }
.cell-muted { color: var(--text-muted); }
.cell-actions { text-align: right; }

.status-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
}

.status-applied      { color: var(--status-applied); background: var(--status-applied-bg); }
.status-interviewing { color: var(--status-interviewing); background: var(--status-interviewing-bg); }
.status-offered      { color: var(--status-offered); background: var(--status-offered-bg); }
.status-rejected     { color: var(--status-rejected); background: var(--status-rejected-bg); }

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-count { font-size: 13px; color: var(--text-muted); }

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info { font-size: 13px; color: var(--text-muted); }

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}
</style>
