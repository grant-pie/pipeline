<template>
  <div class="page">
    <div class="page-header mt-3 mt-md-0">
      <h1 class="page-title">Applications</h1>
      <RouterLink to="/jobs/new" class="btn-primary btn-sm new-btn">
        + New application
      </RouterLink>
    </div>

    <!-- Search + Filters -->
    <div class="toolbar">
      <div class="search-wrap">
        <input
          v-model="search"
          type="search"
          class="search-input"
          placeholder="Search by company, title or date…"
        />
        <p class="search-hint">Search dates using YYYY-MM-DD format, e.g. <span>2026</span>, <span>2026-03</span>, or <span>2026-03-20</span></p>
      </div>
      <div class="filters">
        <button
          v-for="s in statuses"
          :key="s.value"
          class="filter-btn"
          :class="{ active: activeFilter === s.value }"
          @click="activeFilter = s.value"
        >
          {{ s.label }}
          <span class="filter-count">{{ s.value === 'all' ? jobsStore.total : (jobsStore.statusCounts[s.value] ?? 0) }}</span>
        </button>
      </div>
    </div>

    <!-- States -->
    <div v-if="jobsStore.loading" class="state-msg">Loading…</div>
    <div v-else-if="jobsStore.error" class="state-msg error-msg">{{ jobsStore.error }}</div>
    <div v-else-if="jobsStore.jobs.length === 0 && !search.trim()" class="empty-state">
      <p class="empty-title">No applications yet</p>
      <p class="empty-sub">
        <RouterLink to="/jobs/new">Add your first application</RouterLink> to get started.
      </p>
    </div>
    <div v-else-if="jobsStore.jobs.length === 0" class="empty-state">
      <p class="empty-title">No results</p>
      <p class="empty-sub">No applications match your search.</p>
    </div>

    <!-- Job list -->
    <div v-else class="job-list" :class="{ 'job-list--searching': jobsStore.searching }">
      <p v-if="deleteError" class="state-msg error-msg">{{ deleteError }}</p>
      <JobCard
        v-for="job in jobsStore.jobs"
        :key="job.id"
        :job="job"
        @delete="handleDelete"
      />
      <div ref="sentinel" class="sentinel" />
      <div v-if="jobsStore.loadingMore" class="state-msg load-more-msg">Loading more…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useJobsStore } from '@/stores/jobs';
import JobCard from '@/components/JobCard.vue';
import type { JobStatus } from '@/types';

const jobsStore = useJobsStore();

const statuses: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
];

const activeFilter = ref<JobStatus | 'all'>('all');
const search = ref('');
const deleteError = ref('');
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function statusParam() {
  return activeFilter.value === 'all' ? undefined : activeFilter.value;
}

watch(activeFilter, () => {
  if (search.value.trim()) {
    jobsStore.searchJobs(search.value.trim(), statusParam());
  } else {
    jobsStore.fetchJobs(statusParam());
  }
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (q.trim()) {
      jobsStore.searchJobs(q.trim(), statusParam());
    } else {
      jobsStore.fetchJobs(statusParam());
    }
  }, 300);
});


async function handleDelete(id: string) {
  if (!confirm('Delete this application?')) return;
  deleteError.value = '';
  try {
    await jobsStore.deleteJob(id);
  } catch (e) {
    deleteError.value = (e as Error).message || 'Failed to delete application.';
  }
}

onMounted(async () => {
  await jobsStore.fetchJobs();

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        jobsStore.fetchNextPage();
      }
    },
    { rootMargin: '200px' },
  );

  if (sentinel.value) observer.observe(sentinel.value);
});

onUnmounted(() => observer?.disconnect());
</script>

<style scoped>
/* Override the global .page max-width so 3 columns have room to breathe */
.page {
  max-width: 1200px;
}

.new-btn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 13px;
  padding: 7px 14px;
}

.new-btn:hover {
  text-decoration: none;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
}

.search-input {
  width: 100%;
  max-width: 360px;
  padding: 7px 12px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-hint {
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-muted);
}

.search-hint span {
  font-family: monospace;
}

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 100px;
}

.filter-btn:hover {
  border-color: var(--border-hover);
  color: var(--text);
}

.filter-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(91, 138, 240, 0.08);
}

.filter-count {
  font-size: 11px;
  color: inherit;
  opacity: 0.7;
}

.job-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  transition: opacity 0.15s ease;
}

@media (max-width: 900px) {
  .job-list { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .job-list { grid-template-columns: 1fr; }
}

.job-list--searching {
  opacity: 0.5;
  pointer-events: none;
}

.state-msg {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 0;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
}

.sentinel {
  height: 1px;
}

.load-more-msg {
  padding: 20px 0;
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
