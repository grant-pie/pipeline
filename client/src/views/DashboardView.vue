<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Applications</h1>
      <RouterLink to="/jobs/new" class="btn-primary btn-sm new-btn">
        + New application
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="filters">
      <button
        v-for="s in statuses"
        :key="s.value"
        class="filter-btn"
        :class="{ active: activeFilter === s.value }"
        @click="activeFilter = s.value"
      >
        {{ s.label }}
        <span class="filter-count">{{ countByStatus(s.value) }}</span>
      </button>
    </div>

    <!-- States -->
    <div v-if="jobsStore.loading" class="state-msg">Loading…</div>
    <div v-else-if="jobsStore.error" class="state-msg error-msg">{{ jobsStore.error }}</div>
    <div v-else-if="filteredJobs.length === 0" class="empty-state">
      <p class="empty-title">No applications yet</p>
      <p class="empty-sub">
        <RouterLink to="/jobs/new">Add your first application</RouterLink> to get started.
      </p>
    </div>

    <!-- Job list -->
    <div v-else class="job-list">
      <JobCard
        v-for="job in filteredJobs"
        :key="job.id"
        :job="job"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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

const filteredJobs = computed(() =>
  activeFilter.value === 'all'
    ? jobsStore.jobs
    : jobsStore.jobs.filter((j) => j.status === activeFilter.value),
);

function countByStatus(status: JobStatus | 'all'): number {
  return status === 'all'
    ? jobsStore.jobs.length
    : jobsStore.jobs.filter((j) => j.status === status).length;
}

async function handleDelete(id: string) {
  if (!confirm('Delete this application?')) return;
  await jobsStore.deleteJob(id);
}

onMounted(() => jobsStore.fetchJobs());
</script>

<style scoped>
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

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 28px;
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
  display: flex;
  flex-direction: column;
  gap: 12px;
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
</style>
