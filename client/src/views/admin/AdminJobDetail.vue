<template>
  <div>
    <div class="back-row">
      <RouterLink :to="{ name: 'admin-jobs' }" class="back-link">← Jobs</RouterLink>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>

    <template v-else-if="job">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ job.company }}</h1>
          <div class="meta-row">
            <span class="job-title-sub">{{ job.title }}</span>
            <span class="status-pill" :class="`status-${job.status}`">{{ job.status }}</span>
          </div>
        </div>
      </div>

      <p v-if="actionMsg" class="action-msg" :class="actionMsgType">{{ actionMsg }}</p>

      <!-- Edit form -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Details</h2>
          <div class="edit-controls" v-if="!editing">
            <button class="btn-ghost btn-sm" @click="startEdit">Edit</button>
          </div>
          <div class="edit-controls" v-else>
            <button class="btn-ghost btn-sm" @click="cancelEdit">Cancel</button>
            <button class="btn-primary btn-sm" :disabled="busy === 'save'" @click="saveEdit">
              {{ busy === 'save' ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>

        <!-- Read view -->
        <div v-if="!editing" class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">Company</span>
            <span class="detail-value">{{ job.company }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Title</span>
            <span class="detail-value">{{ job.title }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value">
              <span class="status-pill" :class="`status-${job.status}`">{{ job.status }}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date Applied</span>
            <span class="detail-value">{{ formatDate(job.dateApplied) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Job Posting</span>
            <span class="detail-value">
              <a v-if="job.link" :href="job.link" target="_blank" rel="noopener" class="ext-link">
                {{ job.link }} ↗
              </a>
              <span v-else class="cell-muted">—</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Notes</span>
            <span class="detail-value notes-value">{{ job.notes || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Owner</span>
            <span class="detail-value">
              <RouterLink
                v-if="job.user"
                :to="{ name: 'admin-user-detail', params: { id: job.user.id } }"
                class="user-link"
              >{{ job.user.email }}</RouterLink>
              <span v-else class="cell-muted">—</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created</span>
            <span class="detail-value cell-muted">{{ formatDate(job.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Updated</span>
            <span class="detail-value cell-muted">{{ formatDate(job.updatedAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Job ID</span>
            <span class="detail-value cell-muted monospace">{{ job.id }}</span>
          </div>
        </div>

        <!-- Edit view -->
        <div v-else class="edit-form">
          <div class="form-row">
            <label class="form-label">Company</label>
            <input v-model="draft.company" class="form-input" maxlength="100" />
          </div>
          <div class="form-row">
            <label class="form-label">Title</label>
            <input v-model="draft.title" class="form-input" maxlength="100" />
          </div>
          <div class="form-row">
            <label class="form-label">Status</label>
            <select v-model="draft.status" class="form-select">
              <option value="applied">applied</option>
              <option value="interviewing">interviewing</option>
              <option value="offered">offered</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">Date Applied</label>
            <input v-model="draft.dateApplied" type="date" class="form-input" />
          </div>
          <div class="form-row">
            <label class="form-label">Job Posting URL</label>
            <input v-model="draft.link" class="form-input" placeholder="https://…" maxlength="500" />
          </div>
          <div class="form-row form-row--top">
            <label class="form-label">Notes</label>
            <textarea v-model="draft.notes" class="form-textarea" rows="5" maxlength="2000" />
          </div>
        </div>
      </section>

      <!-- Danger zone -->
      <section class="section">
        <h2 class="section-title">Danger zone</h2>
        <div class="action-grid">
          <div class="action-card action-card--danger">
            <div class="action-info">
              <span class="action-label">Delete job</span>
              <span class="action-desc">Permanently removes this application</span>
            </div>
            <div class="action-btns">
              <button
                class="btn-danger btn-sm"
                :disabled="busy === 'delete'"
                @click="deleteJob"
              >Delete job</button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, type AdminJob } from '@/api/admin';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const job = ref<AdminJob | null>(null);
const loading = ref(true);
const error = ref('');
const busy = ref<string | null>(null);
const actionMsg = ref('');
const actionMsgType = ref<'success' | 'error'>('success');
const editing = ref(false);

interface Draft {
  company: string;
  title: string;
  status: string;
  dateApplied: string;
  link: string;
  notes: string;
}

const draft = ref<Draft>({ company: '', title: '', status: '', dateApplied: '', link: '', notes: '' });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    job.value = await adminApi.getJob(id);
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load job.';
  } finally {
    loading.value = false;
  }
}

function showMsg(msg: string, type: 'success' | 'error' = 'success') {
  actionMsg.value = msg;
  actionMsgType.value = type;
  setTimeout(() => { actionMsg.value = ''; }, 4000);
}

function startEdit() {
  const j = job.value!;
  draft.value = {
    company: j.company,
    title: j.title,
    status: j.status,
    dateApplied: j.dateApplied.slice(0, 10),
    link: j.link ?? '',
    notes: j.notes ?? '',
  };
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function saveEdit() {
  busy.value = 'save';
  try {
    const updated = await adminApi.updateJob(id, {
      company: draft.value.company.trim(),
      title: draft.value.title.trim(),
      status: draft.value.status,
      dateApplied: draft.value.dateApplied,
      link: draft.value.link.trim() || undefined,
      notes: draft.value.notes.trim() || undefined,
    });
    job.value = updated;
    editing.value = false;
    showMsg('Job updated.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to save changes.', 'error');
  } finally {
    busy.value = null;
  }
}

async function deleteJob() {
  if (!confirm(`Permanently delete this ${job.value?.company} application?`)) return;
  busy.value = 'delete';
  try {
    await adminApi.deleteJob(id);
    router.push({ name: 'admin-jobs' });
  } catch (e) {
    showMsg((e as Error).message || 'Failed to delete job.', 'error');
    busy.value = null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

onMounted(load);
</script>

<style scoped>
.back-row { margin-bottom: 24px; }

.back-link {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
}

.back-link:hover { color: var(--text); }

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.job-title-sub {
  font-size: 15px;
  color: var(--text-muted);
}

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

.action-msg {
  font-size: 13px;
  margin-bottom: 20px;
  padding: 10px 14px;
  border-radius: var(--radius);
}

.action-msg.success {
  color: var(--success);
  background: rgba(61,186,115,0.08);
  border: 1px solid rgba(61,186,115,0.2);
}

.action-msg.error {
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid rgba(224,85,85,0.25);
}

.section { margin-bottom: 40px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0;
}

.edit-controls { display: flex; gap: 8px; }

/* Read view */
.detail-grid {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.detail-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
  color: var(--text-muted);
  min-width: 110px;
  flex-shrink: 0;
}

.detail-value { color: var(--text); word-break: break-all; }

.notes-value { white-space: pre-wrap; }

.cell-muted { color: var(--text-muted); }

.monospace { font-family: monospace; font-size: 12px; }

.user-link { color: var(--accent); text-decoration: none; }
.user-link:hover { text-decoration: underline; }

.ext-link { color: var(--accent); text-decoration: none; word-break: break-all; }
.ext-link:hover { text-decoration: underline; }

/* Edit form */
.edit-form {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.form-row:last-child { border-bottom: none; }

.form-row--top { align-items: flex-start; padding-top: 14px; }

.form-label {
  color: var(--text-muted);
  min-width: 110px;
  flex-shrink: 0;
}

.form-input,
.form-select {
  flex: 1;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.form-input:focus,
.form-select:focus { border-color: var(--accent); }

.form-textarea {
  flex: 1;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.form-textarea:focus { border-color: var(--accent); }

/* Danger zone */
.action-grid {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--surface);
  gap: 16px;
}

.action-card--danger { border-top: none; }

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-label { font-size: 13px; font-weight: 500; }
.action-desc { font-size: 12px; color: var(--text-muted); }

.action-btns { display: flex; gap: 8px; flex-shrink: 0; }

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}
</style>
