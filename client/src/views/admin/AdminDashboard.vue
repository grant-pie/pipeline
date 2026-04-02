<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Overview</h1>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>

    <template v-else-if="stats">
      <section class="section">
        <h2 class="section-title">Users</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-value">{{ stats.users.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.users.verified }}</span>
            <span class="stat-label">Verified</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" :class="{ 'text-danger': stats.users.suspended > 0 }">
              {{ stats.users.suspended }}
            </span>
            <span class="stat-label">Suspended</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.users.admins }}</span>
            <span class="stat-label">Admins</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Jobs</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-value">{{ stats.jobs.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: var(--status-applied)">
              {{ stats.jobs.byStatus['applied'] ?? 0 }}
            </span>
            <span class="stat-label">Applied</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: var(--status-interviewing)">
              {{ stats.jobs.byStatus['interviewing'] ?? 0 }}
            </span>
            <span class="stat-label">Interviewing</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: var(--status-offered)">
              {{ stats.jobs.byStatus['offered'] ?? 0 }}
            </span>
            <span class="stat-label">Offered</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: var(--status-rejected)">
              {{ stats.jobs.byStatus['rejected'] ?? 0 }}
            </span>
            <span class="stat-label">Rejected</span>
          </div>
        </div>
      </section>

      <div class="quick-links">
        <RouterLink :to="{ name: 'admin-users' }" class="btn-ghost btn-sm">Manage users →</RouterLink>
        <RouterLink :to="{ name: 'admin-jobs' }" class="btn-ghost btn-sm">Manage jobs →</RouterLink>
        <RouterLink :to="{ name: 'admin-audit-log' }" class="btn-ghost btn-sm">View audit log →</RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi, type AdminStats } from '@/api/admin';

const stats = ref<AdminStats | null>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    stats.value = await adminApi.getStats();
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load stats.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 14px;
}

.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.5px;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.text-danger {
  color: var(--danger);
}

.quick-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-links a {
  text-decoration: none;
}

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}
</style>
