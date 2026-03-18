<template>
  <article class="job-card">
    <div class="card-top">
      <div class="card-info">
        <h3 class="job-title">{{ job.title }}</h3>
        <p class="job-company">{{ job.company }}</p>
      </div>
      <span class="status-badge" :class="`status-${job.status}`">
        {{ job.status }}
      </span>
    </div>

    <div class="card-meta">
      <span>Applied {{ formatDate(job.dateApplied) }}</span>
      <a v-if="job.link" :href="job.link" target="_blank" rel="noopener" class="meta-link">
        View posting ↗
      </a>
    </div>

    <p v-if="job.notes" class="job-notes">{{ job.notes }}</p>

    <div class="card-actions">
      <RouterLink :to="`/jobs/${job.id}/edit`" class="btn-ghost btn-sm action-link">
        Edit
      </RouterLink>
      <button class="btn-danger btn-sm" @click="$emit('delete', job.id)">
        Delete
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { JobApplication } from '@/types';

defineProps<{ job: JobApplication }>();
defineEmits<{ delete: [id: string] }>();

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<style scoped>
.job-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.15s;
}

.job-card:hover {
  border-color: var(--border-hover);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.card-info {
  min-width: 0;
  flex: 1;
}

.job-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-company {
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 3px 9px;
  border-radius: 100px;
  flex-shrink: 0;
}

.status-applied {
  background: var(--status-applied-bg);
  color: var(--status-applied);
}

.status-interviewing {
  background: var(--status-interviewing-bg);
  color: var(--status-interviewing);
}

.status-offered {
  background: var(--status-offered-bg);
  color: var(--status-offered);
}

.status-rejected {
  background: var(--status-rejected-bg);
  color: var(--status-rejected);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.meta-link {
  color: var(--accent);
  font-size: 13px;
}

.job-notes {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow-wrap: break-word;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-link {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  padding: 5px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  background: transparent;
  transition: border-color 0.15s, color 0.15s;
  text-decoration: none;
}

.action-link:hover {
  border-color: var(--border-hover);
  color: var(--text);
  text-decoration: none;
}
</style>
