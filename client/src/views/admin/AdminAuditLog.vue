<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Audit Log</h1>
    </div>

    <div class="toolbar">
      <input
        v-model="searchInput"
        type="search"
        class="search-input"
        placeholder="Search by admin email, action, target or detail…"
      />
      <div class="total-label" v-if="total > 0">{{ total }} entries</div>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>
    <div v-else-if="entries.length === 0" class="state-msg">No audit log entries yet.</div>

    <template v-else>
      <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="setSort('createdAt')" class="sortable">
              Time <span class="sort-icon">{{ sortIcon('createdAt') }}</span>
            </th>
            <th @click="setSort('adminEmail')" class="sortable">
              Admin <span class="sort-icon">{{ sortIcon('adminEmail') }}</span>
            </th>
            <th @click="setSort('action')" class="sortable">
              Action <span class="sort-icon">{{ sortIcon('action') }}</span>
            </th>
            <th @click="setSort('targetType')" class="sortable">
              Target <span class="sort-icon">{{ sortIcon('targetType') }}</span>
            </th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td class="cell-time">{{ formatDateTime(entry.createdAt) }}</td>
            <td class="cell-muted">{{ entry.adminEmail }}</td>
            <td>
              <span class="action-tag" :class="actionClass(entry.action)">
                {{ formatAction(entry.action) }}
              </span>
            </td>
            <td class="cell-muted">
              {{ entry.targetType }}
              <span v-if="entry.targetId" class="cell-id">{{ entry.targetId.slice(0, 8) }}…</span>
            </td>
            <td class="cell-meta">{{ formatMeta(entry.metadata) }}</td>
          </tr>
        </tbody>
      </table>
      </div>

      <div class="pagination">
        <button class="btn-ghost btn-sm" :disabled="page === 1" @click="prev">← Prev</button>
        <span class="page-info">Page {{ page }}</span>
        <button class="btn-ghost btn-sm" :disabled="!hasMore" @click="next">Next →</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * AdminAuditLog.vue — Admin audit trail viewer.
 *
 * Displays a paginated, searchable, sortable log of all admin actions. Each
 * entry records which admin performed the action, what action was taken, the
 * target entity type and ID, relevant metadata, and when it occurred.
 *
 * Action formatting:
 *   - formatAction() maps raw action keys (e.g. SET_ROLE) to readable labels.
 *   - actionClass() colour-codes actions: danger (destructive), warn (sensitive),
 *     or neutral (informational).
 *   - formatMeta() renders the metadata field into a short human-readable string:
 *     email address, "Company — Title", or "N jobs".
 *
 * Target IDs are abbreviated (first 8 chars + …) to keep the table compact.
 */
import { ref, watch, onMounted } from 'vue';
import { adminApi, type AuditLogEntry } from '@/api/admin';

const entries = ref<AuditLogEntry[]>([]);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const hasMore = ref(false);
const total = ref(0);
const searchInput = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref<'ASC' | 'DESC'>('DESC');

let searchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetches the current page of audit log entries from the API.
 */
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await adminApi.getAuditLog(
      page.value, 50,
      searchInput.value.trim() || undefined,
      sortBy.value,
      sortOrder.value,
    );
    entries.value = res.data;
    total.value = res.total;
    hasMore.value = res.hasMore;
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load audit log.';
  } finally {
    loading.value = false;
  }
}

watch(searchInput, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, 300);
});

/** Navigates to the previous page and reloads. */
function prev() { page.value--; load(); }
/** Navigates to the next page and reloads. */
function next() { page.value++; load(); }

/**
 * Handles a column header click for sorting.
 *
 * @param col - Column key to sort by (e.g. 'createdAt', 'action').
 */
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

/**
 * Returns the sort indicator character for a column header.
 *
 * @param col - The column key to check.
 * @returns '↑', '↓', or '↕'.
 */
function sortIcon(col: string) {
  if (sortBy.value !== col) return '↕';
  return sortOrder.value === 'ASC' ? '↑' : '↓';
}

/**
 * Formats an ISO timestamp as "D Mon HH:MM" for the Time column.
 *
 * @param iso - An ISO 8601 date-time string.
 * @returns A short date-time string such as "1 Jan 14:30".
 */
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Maps raw action key strings to display labels. */
const ACTION_LABELS: Record<string, string> = {
  SET_ROLE: 'Set role',
  SUSPEND_USER: 'Suspended',
  UNSUSPEND_USER: 'Unsuspended',
  DELETE_USER: 'Deleted user',
  FORCE_VERIFY: 'Force verified',
  RESEND_VERIFICATION: 'Resent verification',
  TRIGGER_PASSWORD_RESET: 'Password reset',
  UPDATE_JOB: 'Updated job',
  DELETE_JOB: 'Deleted job',
  BULK_DELETE_JOBS: 'Bulk deleted jobs',
};

/**
 * Converts a raw action key to its human-readable label.
 *
 * @param action - The raw action string from the API (e.g. 'SET_ROLE').
 * @returns The display label, or the raw key if no mapping exists.
 */
function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

/** Actions that are styled with the danger (red) colour. */
const DANGER_ACTIONS = new Set(['DELETE_USER', 'DELETE_JOB', 'BULK_DELETE_JOBS', 'SUSPEND_USER']);
/** Actions that are styled with the warning (amber) colour. */
const WARN_ACTIONS  = new Set(['SET_ROLE', 'TRIGGER_PASSWORD_RESET']);

/**
 * Returns the CSS class to apply to an action tag based on its risk level.
 *
 * @param action - The raw action key.
 * @returns 'action-danger', 'action-warn', or 'action-neutral'.
 */
function actionClass(action: string) {
  if (DANGER_ACTIONS.has(action)) return 'action-danger';
  if (WARN_ACTIONS.has(action)) return 'action-warn';
  return 'action-neutral';
}

/**
 * Extracts a short human-readable detail string from an audit entry's metadata.
 * Priority: email > company—title > count > dash.
 *
 * @param meta - The metadata object from the audit log entry, if present.
 * @returns A short string such as "alice@example.com", "Acme — SWE", "3 jobs", or "—".
 */
function formatMeta(meta?: Record<string, unknown>) {
  if (!meta) return '—';
  if (meta.targetEmail) return String(meta.targetEmail);
  if (meta.company && meta.title) return `${meta.company} — ${meta.title}`;
  if (meta.count !== undefined) return `${meta.count} jobs`;
  return '—';
}

onMounted(load);
</script>

<style scoped>
.total-label { 
  font-size: 13px; 
  color: var(--text-muted); 
  margin-top: 2rem;
}

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

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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

.cell-time  { white-space: nowrap; color: var(--text-muted); font-size: 12px; }
.cell-muted { color: var(--text-muted); }
.cell-meta  { color: var(--text-muted); font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-id    { font-family: monospace; font-size: 11px; margin-left: 4px; }

.action-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
  white-space: nowrap;
}

.action-danger  { color: var(--danger); background: var(--danger-bg); }
.action-warn    { color: var(--warning); background: rgba(224,168,61,0.1); }
.action-neutral { color: var(--text-muted); background: var(--surface-2); }

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
