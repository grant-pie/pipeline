<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Audit Log</h1>
      <span class="total-label" v-if="total > 0">{{ total }} entries</span>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>
    <div v-else-if="entries.length === 0" class="state-msg">No audit log entries yet.</div>

    <template v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Admin</th>
            <th>Action</th>
            <th>Target</th>
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

      <div class="pagination">
        <button class="btn-ghost btn-sm" :disabled="page === 1" @click="prev">← Prev</button>
        <span class="page-info">Page {{ page }}</span>
        <button class="btn-ghost btn-sm" :disabled="!hasMore" @click="next">Next →</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi, type AuditLogEntry } from '@/api/admin';

const entries = ref<AuditLogEntry[]>([]);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const hasMore = ref(false);
const total = ref(0);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await adminApi.getAuditLog(page.value, 50);
    entries.value = res.data;
    total.value = res.total;
    hasMore.value = res.hasMore;
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load audit log.';
  } finally {
    loading.value = false;
  }
}

function prev() { page.value--; load(); }
function next() { page.value++; load(); }

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

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

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

const DANGER_ACTIONS = new Set(['DELETE_USER', 'DELETE_JOB', 'BULK_DELETE_JOBS', 'SUSPEND_USER']);
const WARN_ACTIONS  = new Set(['SET_ROLE', 'TRIGGER_PASSWORD_RESET']);

function actionClass(action: string) {
  if (DANGER_ACTIONS.has(action)) return 'action-danger';
  if (WARN_ACTIONS.has(action)) return 'action-warn';
  return 'action-neutral';
}

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
