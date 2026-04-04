<template>
  <div>
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">ID copied to clipboard</div>
    </Transition>

    <div class="page-header">
      <h1 class="page-title">Users</h1>
      <span class="total-label" v-if="total > 0">{{ total }} total</span>
    </div>

    <div class="toolbar">
      <input
        v-model="searchInput"
        type="search"
        class="search-input"
        placeholder="Search by email or user ID…"
      />
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>
    <div v-else-if="users.length === 0" class="state-msg">No users found.</div>

    <template v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th @click="setSort('email')" class="sortable">
              Email <span class="sort-icon">{{ sortIcon('email') }}</span>
            </th>
            <th @click="setSort('role')" class="sortable">
              Role <span class="sort-icon">{{ sortIcon('role') }}</span>
            </th>
            <th @click="setSort('isSuspended')" class="sortable">
              Status <span class="sort-icon">{{ sortIcon('isSuspended') }}</span>
            </th>
            <th @click="setSort('jobCount')" class="sortable">
              Jobs <span class="sort-icon">{{ sortIcon('jobCount') }}</span>
            </th>
            <th @click="setSort('createdAt')" class="sortable">
              Joined <span class="sort-icon">{{ sortIcon('createdAt') }}</span>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td class="cell-id">
              <span class="user-id" :title="user.id" @click="copyId(user.id)">
                {{ user.id.slice(0, 8) }}…
              </span>
            </td>
            <td class="cell-email">{{ user.email }}</td>
            <td>
              <span class="badge" :class="user.role === 'admin' ? 'badge-admin' : 'badge-user'">
                {{ user.role }}
              </span>
            </td>
            <td>
              <span v-if="user.isSuspended" class="badge badge-danger">suspended</span>
              <span v-else-if="!user.isVerified" class="badge badge-muted">unverified</span>
              <span v-else class="badge badge-success">active</span>
            </td>
            <td class="cell-muted">{{ (user as any).jobCount ?? '—' }}</td>
            <td class="cell-muted">{{ formatDate(user.createdAt) }}</td>
            <td class="cell-actions">
              <RouterLink :to="{ name: 'admin-user-detail', params: { id: user.id } }" class="btn-ghost btn-sm">
                View
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button class="btn-ghost btn-sm" :disabled="page === 1" @click="prev">← Prev</button>
        <span class="page-info">Page {{ page }}</span>
        <button class="btn-ghost btn-sm" :disabled="!hasMore" @click="next">Next →</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { adminApi, type AdminUser } from '@/api/admin';

const users = ref<AdminUser[]>([]);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const hasMore = ref(false);
const total = ref(0);
const searchInput = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref<'ASC' | 'DESC'>('DESC');

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await adminApi.listUsers(
      page.value, 20,
      searchInput.value.trim() || undefined,
      sortBy.value,
      sortOrder.value,
    );
    users.value = res.data;
    total.value = res.total;
    hasMore.value = res.hasMore;
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load users.';
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

const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function copyId(id: string) {
  navigator.clipboard.writeText(id);
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = true;
  toastTimer = setTimeout(() => { toastVisible.value = false; }, 2000);
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

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--surface); }

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--text);
  color: var(--surface);
  font-size: 13px;
  padding: 8px 14px;
  border-radius: var(--radius);
  z-index: 999;
  pointer-events: none;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(6px); }

.cell-id { width: 90px; }

.user-id {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 3px;
}

.user-id:hover {
  background: var(--surface-2);
  color: var(--text);
}

.cell-email { font-weight: 400; }
.cell-muted { color: var(--text-muted); }
.cell-actions { text-align: right; }
.cell-actions a { text-decoration: none; }

.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
}

.badge-admin   { color: var(--accent); background: rgba(91,138,240,0.12); }
.badge-user    { color: var(--text-muted); background: var(--surface-2); }
.badge-success { color: var(--success); background: rgba(61,186,115,0.1); }
.badge-danger  { color: var(--danger); background: var(--danger-bg); }
.badge-muted   { color: var(--text-muted); background: var(--surface-2); }

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.page-info { font-size: 13px; color: var(--text-muted); }

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}
</style>
