<template>
  <div class="page">

    <!-- Not found state -->
    <div v-if="notFound" class="not-found">
      <p class="not-found-title">Application not found</p>
      <p class="not-found-sub">This application doesn't exist or may have been deleted.</p>
      <RouterLink to="/dashboard" class="btn-ghost btn-sm back-link">← Back to dashboard</RouterLink>
    </div>

    <template v-else>
    <div class="page-header mt-3 mt-md-0">
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
            maxlength="100"
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
            maxlength="100"
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
          placeholder="https://example.com/jobs/123"
          maxlength="500"
        />
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea
          id="notes"
          v-model="form.notes"
          placeholder="Interview notes, contacts, follow-up dates…"
          rows="4"
          maxlength="2000"
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
/**
 * JobFormView.vue — Create / Edit job application form.
 *
 * Shared by two routes:
 *   /jobs/new        → Create mode  (isEditing = false, dateApplied defaults to today)
 *   /jobs/:id/edit   → Edit mode    (isEditing = true, form pre-filled from cache or API)
 *
 * On mount in edit mode the component first checks the jobs store cache
 * (getJob) to avoid a redundant API round-trip when navigating from the
 * dashboard. If the job is not cached it fetches it directly; if the fetch
 * fails (e.g. deleted) the not-found state is shown instead of the form.
 *
 * URL field handling:
 *   - normalizeUrl() prepends https:// to bare hostnames before validation.
 *   - The URL is then parsed with the native URL constructor to confirm it
 *     has a valid http/https protocol and a hostname containing a dot.
 *   - Empty URL input is omitted from the payload (sent as undefined).
 *
 * On success the user is redirected back to /dashboard.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useJobsStore } from '@/stores/jobs';
import { jobsApi } from '@/api/jobs';
import { normalizeUrl } from '@/utils/normalizeUrl';
import type { JobStatus } from '@/types';

const router = useRouter();
const route = useRoute();
const jobsStore = useJobsStore();

/** True when the route contains an :id param (edit mode). */
const isEditing = computed(() => !!route.params.id);
/** The job UUID from the route param, or undefined in create mode. */
const jobId = computed(() => route.params.id as string | undefined);

const form = reactive({
  company: '',
  title: '',
  /** Defaults to today's date in YYYY-MM-DD format for new applications. */
  dateApplied: new Date().toISOString().slice(0, 10),
  status: 'applied' as JobStatus,
  link: '',
  notes: '',
});

const loading = ref(false);
const error = ref('');
/** True when the job ID from the URL does not exist (shows not-found state). */
const notFound = ref(false);

/**
 * On mount in edit mode: attempts to load the job from the store cache, falling
 * back to a direct API call. Sets notFound = true if the job cannot be found.
 * Pre-fills the form fields from the loaded job data.
 */
onMounted(async () => {
  if (!isEditing.value || !jobId.value) return;

  // Try store cache first to avoid an unnecessary API call.
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

/**
 * Validates the URL field, builds the API payload, and calls create or update.
 * Redirects to /dashboard on success; shows an error message on failure.
 * Empty link and notes fields are omitted from the payload (sent as undefined).
 */
async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    const normalizedLink = normalizeUrl(form.link);

    // Validate the URL if one was provided.
    if (normalizedLink) {
      try {
        const parsed = new URL(normalizedLink);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
          throw new Error();
        }
      } catch {
        error.value = 'Please enter a valid URL (e.g. https://example.com/jobs/123)';
        loading.value = false;
        return;
      }
    }

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

.mt-3 {
  margin-top: 2rem;
}

@media (min-width: 768px) { 
    .mt-md-0{
    margin-top: 0;
  }
}
</style>
