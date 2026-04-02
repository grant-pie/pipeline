<template>
  <div>
    <div class="back-row">
      <RouterLink :to="{ name: 'admin-users' }" class="back-link">← Users</RouterLink>
    </div>

    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg" style="color: var(--danger)">{{ error }}</div>

    <template v-else-if="user">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ user.email }}</h1>
          <div class="meta-row">
            <span class="badge" :class="user.role === 'admin' ? 'badge-admin' : 'badge-user'">{{ user.role }}</span>
            <span v-if="user.isSuspended" class="badge badge-danger">suspended</span>
            <span v-else-if="!user.isVerified" class="badge badge-muted">unverified</span>
            <span v-else class="badge badge-success">active</span>
            <span class="cell-muted">Joined {{ formatDate(user.createdAt) }}</span>
          </div>
        </div>
      </div>

      <p v-if="actionMsg" class="action-msg" :class="actionMsgType">{{ actionMsg }}</p>

      <!-- Stats -->
      <section class="section">
        <h2 class="section-title">Application Stats</h2>
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-num">{{ (user as any).jobCount ?? 0 }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: var(--status-applied)">{{ (user as any).appliedCount ?? 0 }}</span>
            <span class="stat-lbl">Applied</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: var(--status-interviewing)">{{ (user as any).interviewingCount ?? 0 }}</span>
            <span class="stat-lbl">Interviewing</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: var(--status-offered)">{{ (user as any).offeredCount ?? 0 }}</span>
            <span class="stat-lbl">Offered</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: var(--status-rejected)">{{ (user as any).rejectedCount ?? 0 }}</span>
            <span class="stat-lbl">Rejected</span>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <section class="section">
        <h2 class="section-title">Actions</h2>
        <div class="action-grid">

          <!-- Role -->
          <div class="action-card">
            <div class="action-info">
              <span class="action-label">Role</span>
              <span class="action-desc">Promote or demote this user</span>
            </div>
            <div class="action-btns">
              <button
                v-if="user.role !== 'admin'"
                class="btn-ghost btn-sm"
                :disabled="busy === 'role'"
                @click="setRole('admin')"
              >Promote to admin</button>
              <button
                v-else
                class="btn-ghost btn-sm"
                :disabled="busy === 'role'"
                @click="setRole('user')"
              >Demote to user</button>
            </div>
          </div>

          <!-- Suspend -->
          <div class="action-card">
            <div class="action-info">
              <span class="action-label">Suspension</span>
              <span class="action-desc">Block or restore login access</span>
            </div>
            <div class="action-btns">
              <button
                v-if="!user.isSuspended"
                class="btn-danger btn-sm"
                :disabled="busy === 'suspend'"
                @click="suspend"
              >Suspend</button>
              <button
                v-else
                class="btn-ghost btn-sm"
                :disabled="busy === 'unsuspend'"
                @click="unsuspend"
              >Unsuspend</button>
            </div>
          </div>

          <!-- Verify -->
          <div class="action-card">
            <div class="action-info">
              <span class="action-label">Verification</span>
              <span class="action-desc">Manage email verification</span>
            </div>
            <div class="action-btns">
              <button
                class="btn-ghost btn-sm"
                :disabled="busy === 'verify' || user.isVerified"
                @click="forceVerify"
              >Force verify</button>
              <button
                class="btn-ghost btn-sm"
                :disabled="busy === 'resend' || user.isVerified"
                @click="resendVerification"
              >Resend email</button>
            </div>
          </div>

          <!-- Password reset -->
          <div class="action-card">
            <div class="action-info">
              <span class="action-label">Password</span>
              <span class="action-desc">Send a password reset email</span>
            </div>
            <div class="action-btns">
              <button
                class="btn-ghost btn-sm"
                :disabled="busy === 'pwreset'"
                @click="triggerPasswordReset"
              >Send reset email</button>
            </div>
          </div>

          <!-- Delete -->
          <div class="action-card action-card--danger">
            <div class="action-info">
              <span class="action-label">Delete account</span>
              <span class="action-desc">Permanently removes user and all their jobs</span>
            </div>
            <div class="action-btns">
              <button
                class="btn-danger btn-sm"
                :disabled="busy === 'delete'"
                @click="deleteUser"
              >Delete user</button>
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
import { adminApi, type AdminUser } from '@/api/admin';
import type { UserRole } from '@/types';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const user = ref<AdminUser | null>(null);
const loading = ref(true);
const error = ref('');
const busy = ref<string | null>(null);
const actionMsg = ref('');
const actionMsgType = ref<'success' | 'error'>('success');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    user.value = await adminApi.getUser(id);
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load user.';
  } finally {
    loading.value = false;
  }
}

function showMsg(msg: string, type: 'success' | 'error' = 'success') {
  actionMsg.value = msg;
  actionMsgType.value = type;
  setTimeout(() => { actionMsg.value = ''; }, 4000);
}

async function setRole(role: UserRole) {
  busy.value = 'role';
  try {
    await adminApi.setRole(id, role);
    user.value!.role = role;
    showMsg(`Role updated to ${role}.`);
  } catch (e) {
    showMsg((e as Error).message || 'Failed to update role.', 'error');
  } finally {
    busy.value = null;
  }
}

async function suspend() {
  busy.value = 'suspend';
  try {
    await adminApi.suspendUser(id);
    user.value!.isSuspended = true;
    showMsg('User suspended.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to suspend user.', 'error');
  } finally {
    busy.value = null;
  }
}

async function unsuspend() {
  busy.value = 'unsuspend';
  try {
    await adminApi.unsuspendUser(id);
    user.value!.isSuspended = false;
    showMsg('User unsuspended.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to unsuspend user.', 'error');
  } finally {
    busy.value = null;
  }
}

async function forceVerify() {
  busy.value = 'verify';
  try {
    await adminApi.forceVerify(id);
    user.value!.isVerified = true;
    showMsg('User verified.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to verify user.', 'error');
  } finally {
    busy.value = null;
  }
}

async function resendVerification() {
  busy.value = 'resend';
  try {
    await adminApi.resendVerification(id);
    showMsg('Verification email sent.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to send email.', 'error');
  } finally {
    busy.value = null;
  }
}

async function triggerPasswordReset() {
  busy.value = 'pwreset';
  try {
    await adminApi.triggerPasswordReset(id);
    showMsg('Password reset email sent.');
  } catch (e) {
    showMsg((e as Error).message || 'Failed to send email.', 'error');
  } finally {
    busy.value = null;
  }
}

async function deleteUser() {
  if (!confirm(`Permanently delete ${user.value?.email} and all their data?`)) return;
  busy.value = 'delete';
  try {
    await adminApi.deleteUser(id);
    router.push({ name: 'admin-users' });
  } catch (e) {
    showMsg((e as Error).message || 'Failed to delete user.', 'error');
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

.back-link:hover { color: var(--text); text-decoration: none; }

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.cell-muted { color: var(--text-muted); font-size: 13px; }

.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
}

.badge-admin   { color: var(--accent); background: rgba(91,138,240,0.12); }
.badge-user    { color: var(--text-muted); background: var(--surface-2); }
.badge-success { color: var(--success); background: rgba(61,186,115,0.1); }
.badge-danger  { color: var(--danger); background: var(--danger-bg); }
.badge-muted   { color: var(--text-muted); background: var(--surface-2); }

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

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 14px;
}

.stat-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-num {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
  line-height: 1;
}

.stat-lbl { font-size: 12px; color: var(--text-muted); }

.action-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
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

.action-card--danger {
  border-top: 1px solid var(--border);
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action-label { font-size: 13px; font-weight: 500; }

.action-desc { font-size: 12px; color: var(--text-muted); }

.action-btns {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.state-msg {
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 0;
  text-align: center;
}
</style>
