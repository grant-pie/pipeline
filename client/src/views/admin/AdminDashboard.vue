<template>
  <div>
    <div class="page-header">
      <h1 class="page-title mt-2 mt-md-0">Overview</h1>
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

      <template v-if="charts">
        <section class="section">
          <h2 class="section-title">User Growth</h2>
          <div class="chart-card">
            <Line :data="userGrowthData" :options="lineOptions" />
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Job Activity</h2>
          <div class="chart-card">
            <Bar :data="jobActivityData" :options="stackedBarOptions" />
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Top Companies</h2>
          <div class="chart-card chart-card--short">
            <Bar :data="topCompaniesData" :options="horizontalBarOptions" />
          </div>
        </section>
      </template>

      <div class="quick-links">
        <RouterLink :to="{ name: 'admin-users' }" class="btn-ghost btn-sm">Manage users →</RouterLink>
        <RouterLink :to="{ name: 'admin-jobs' }" class="btn-ghost btn-sm">Manage jobs →</RouterLink>
        <RouterLink :to="{ name: 'admin-audit-log' }" class="btn-ghost btn-sm">View audit log →</RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * AdminDashboard.vue — Admin overview statistics and charts.
 *
 * Loads user and job aggregate statistics (AdminStats) alongside chart datasets
 * (AdminCharts) in a single Promise.all on mount. Renders:
 *   - User stat cards: total, verified, suspended (red when > 0), admins.
 *   - Job stat cards: total and per-status counts.
 *   - Three Chart.js charts (via vue-chartjs):
 *       1. User Growth       — line chart of cumulative users by month.
 *       2. Job Activity      — stacked bar chart of job applications by month.
 *       3. Top Companies     — horizontal bar chart of most-applied-to companies.
 *   - Quick links to the Users, Jobs, and Audit Log admin pages.
 *
 * Charts are only rendered when chart data is available (v-if="charts"), so a
 * partial failure (charts null) still allows the stat cards to display.
 */
import { ref, computed, onMounted } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'vue-chartjs';
import { adminApi, type AdminStats, type AdminCharts } from '@/api/admin';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const stats  = ref<AdminStats | null>(null);
const charts = ref<AdminCharts | null>(null);
const loading = ref(true);
const error   = ref('');

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  applied:       '#5b8af0',
  appliedBg:     'rgba(91,138,240,0.15)',
  interviewing:  '#e0a83d',
  interviewingBg:'rgba(224,168,61,0.15)',
  offered:       '#3dba73',
  offeredBg:     'rgba(61,186,115,0.15)',
  rejected:      '#888',
  rejectedBg:    'rgba(136,136,136,0.15)',
  grid:          '#272727',
  text:          '#888',
};

// ─── Shared axis/tooltip defaults ─────────────────────────────────────────────
const baseOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { labels: { color: C.text, boxWidth: 12, font: { size: 12 } } },
    tooltip: { bodyColor: '#e4e4e4', titleColor: '#e4e4e4', backgroundColor: '#1e1e1e', borderColor: '#272727', borderWidth: 1 },
  },
  scales: {
    x: { ticks: { color: C.text, font: { size: 11 } }, grid: { color: C.grid } },
    y: { ticks: { color: C.text, font: { size: 11 } }, grid: { color: C.grid } },
  },
};

/**
 * Converts an array of 'YYYY-MM' month strings to short display labels
 * such as "Jan 26" for use as Chart.js x-axis tick labels.
 *
 * @param labels - Array of 'YYYY-MM' strings from the API chart data.
 * @returns Array of formatted month strings.
 */
function formatMonths(labels: string[]) {
  return labels.map(m => {
    const [year, month] = m.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });
}

// ─── Chart data ───────────────────────────────────────────────────────────────
const userGrowthData = computed(() => ({
  labels: formatMonths(charts.value!.userGrowth.labels),
  datasets: [{
    label: 'Total users',
    data: charts.value!.userGrowth.data,
    borderColor: C.applied,
    backgroundColor: C.appliedBg,
    fill: true,
    tension: 0.4,
    pointRadius: 3,
  }],
}));

const jobActivityData = computed(() => ({
  labels: formatMonths(charts.value!.jobActivity.labels),
  datasets: [
    { label: 'Applied',       data: charts.value!.jobActivity.datasets.applied,       backgroundColor: C.applied },
    { label: 'Interviewing',  data: charts.value!.jobActivity.datasets.interviewing,  backgroundColor: C.interviewing },
    { label: 'Offered',       data: charts.value!.jobActivity.datasets.offered,       backgroundColor: C.offered },
    { label: 'Rejected',      data: charts.value!.jobActivity.datasets.rejected,      backgroundColor: C.rejected },
  ],
}));

const topCompaniesData = computed(() => ({
  labels: charts.value!.topCompanies.labels,
  datasets: [{
    label: 'Applications',
    data: charts.value!.topCompanies.data,
    backgroundColor: C.appliedBg,
    borderColor: C.applied,
    borderWidth: 1,
    borderRadius: 4,
  }],
}));

// ─── Chart options ────────────────────────────────────────────────────────────
const lineOptions = {
  ...baseOptions,
  plugins: { ...baseOptions.plugins, legend: { display: false } },
};

const stackedBarOptions = {
  ...baseOptions,
  scales: {
    x: { ...baseOptions.scales.x, stacked: true },
    y: { ...baseOptions.scales.y, stacked: true },
  },
};

const horizontalBarOptions = {
  ...baseOptions,
  indexAxis: 'y' as const,
  plugins: { ...baseOptions.plugins, legend: { display: false } },
  scales: {
    x: { ...baseOptions.scales.x, beginAtZero: true },
    y: { ...baseOptions.scales.y },
  },
};

/**
 * On mount: fetches stats and chart data concurrently. If either call fails
 * the error is shown and the stats/charts sections are hidden.
 */
onMounted(async () => {
  try {
    [stats.value, charts.value] = await Promise.all([
      adminApi.getStats(),
      adminApi.getCharts(),
    ]);
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

.text-danger { color: var(--danger); }

.chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  height: 280px;
}

.chart-card--short {
  height: 320px;
}

.quick-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.quick-links a { text-decoration: none; }

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}

.mt-3 {
  margin-top: 15rem;
}
@media (min-width: 768px) { 
    .mt-md-0{
    margin-top: 0;
  }
}
</style>
