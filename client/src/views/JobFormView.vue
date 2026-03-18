<template>
  <div class="page">

    <!-- Not found state -->
    <div v-if="notFound" class="not-found">
      <p class="not-found-title">Application not found</p>
      <p class="not-found-sub">This application doesn't exist or may have been deleted.</p>
      <RouterLink to="/dashboard" class="btn-ghost btn-sm back-link">← Back to dashboard</RouterLink>
    </div>

    <template v-else>
    <div class="page-header">
      <h1 class="page-title">{{ isEditing ? 'Edit application' : 'New application' }}</h1>
      <RouterLink to="/dashboard" class="btn-ghost btn-sm back-link">← Back</RouterLink>
    </div>

    <form class="form-card" @submit.prevent="handleSubmit">
      <div class="form-row">
        <div class="form-group">
          <label for="company">Company</label>
          <input
            id="company"
            v-model="form.company"
            type="text"
            placeholder="Acme Corp"
            required
          />
        </div>

        <div class="form-group">
          <label for="title">Job title</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="Software Engineer"
            required
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="dateApplied">Date applied</label>
          <input
            id="dateApplied"
            v-model="form.dateApplied"
            type="date"
            required
          />
        </div>

        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" v-model="form.status" required>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="link">Job posting URL</label>
        <input
          id="link"
          v-model="form.link"
          type="text"
          placeholder="google.com or https://google.com"
        />
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea
          id="notes"
          v-model="form.notes"
          placeholder="Interview notes, contacts, follow-up dates…"
          rows="4"
        />
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div class="form-actions">
        <RouterLink to="/dashboard" class="btn-ghost btn-sm back-link">Cancel</RouterLink>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving…' : isEditing ? 'Save changes' : 'Add application' }}
        </button>
      </div>
    </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useJobsStore } from '@/stores/jobs';
import { jobsApi } from '@/api/jobs';
import type { JobStatus } from '@/types';

const router = useRouter();
const route = useRoute();
const jobsStore = useJobsStore();

const isEditing = computed(() => !!route.params.id);
const jobId = computed(() => route.params.id as string | undefined);

const form = reactive({
  company: '',
  title: '',
  dateApplied: new Date().toISOString().slice(0, 10),
  status: 'applied' as JobStatus,
  link: '',
  notes: '',
});

const loading = ref(false);
const error = ref('');
const notFound = ref(false);

onMounted(async () => {
  if (!isEditing.value || !jobId.value) return;

  // Try store cache first, fallback to API
  let job = jobsStore.getJob(jobId.value);
  if (!job) {
    try {
      job = await jobsApi.getOne(jobId.value);
    } catch {
      notFound.value = true;
      return;
    }
  }

  form.company = job.company;
  form.title = job.title;
  form.dateApplied = job.dateApplied.slice(0, 10);
  form.status = job.status;
  form.link = job.link ?? '';
  form.notes = job.notes ?? '';
});

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    const rawLink = form.link.trim();
    const normalizedLink = rawLink && !/^https?:\/\//i.test(rawLink)
      ? `https://${rawLink}`
      : rawLink;

    const payload = {
      company: form.company,
      title: form.title,
      dateApplied: form.dateApplied,
      status: form.status,
      link: normalizedLink || undefined,
      notes: form.notes || undefined,
    };

    if (isEditing.value && jobId.value) {
      await jobsStore.updateJob(jobId.value, payload);
    } else {
      await jobsStore.createJob(payload);
    }

    router.push({ name: 'dashboard' });
  } catch (e) {
    error.value = (e as Error).message || 'Failed to save';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  max-width: 640px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  padding: 5px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  background: transparent;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}

.back-link:hover {
  border-color: var(--border-hover);
  color: var(--text);
  text-decoration: none;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 0;
  gap: 10px;
}

.not-found-title {
  font-size: 18px;
  font-weight: 600;
}

.not-found-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

@media (max-width: 500px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
