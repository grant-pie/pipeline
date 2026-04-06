/**
 * env.d.ts — TypeScript ambient declarations.
 *
 * Provides Vite's client-side type definitions (e.g. import.meta.env) and
 * extends Vue Router's RouteMeta interface so that route guard flags can be
 * declared inline on route definitions with full type safety.
 */

/// <reference types="vite/client" />

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Redirect unauthenticated users to /login when true. */
    requiresAuth?: boolean;
    /** Redirect non-admin users to /dashboard when true. */
    requiresAdmin?: boolean;
    /** Redirect already-authenticated users to /dashboard when true. */
    guest?: boolean;
    /** Page title shown in the browser tab (appended with "| Pipeline"). */
    title?: string;
  }
}
