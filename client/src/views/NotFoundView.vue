<template>
  <div class="not-found-page">
    <p class="code">404</p>
    <h1 class="title">Page not found</h1>
    <p class="sub">The page you're looking for doesn't exist.</p>
    <RouterLink to="/dashboard" class="btn-ghost btn-sm back-link">← Back to dashboard</RouterLink>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  gap: 10px;
}

.code {
  font-size: 72px;
  font-weight: 700;
  color: var(--border-hover);
  line-height: 1;
  letter-spacing: -2px;
}

.title {
  font-size: 20px;
  font-weight: 600;
}

.sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  padding: 6px 14px;
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
</style>
