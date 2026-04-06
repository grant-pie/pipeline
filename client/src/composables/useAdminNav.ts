/**
 * composables/useAdminNav.ts — Shared admin drawer state.
 *
 * Exposes a single reactive boolean ref (drawerOpen) that is shared between
 * NavBar (which owns the hamburger button) and AdminNav (which renders the
 * sliding drawer). Because the ref is module-level, all callers reference the
 * same instance — toggling it in NavBar is immediately reflected in AdminNav
 * without needing prop drilling or a store.
 */

import { ref } from 'vue';

/** Module-level singleton so both NavBar and AdminNav share the same state. */
const drawerOpen = ref(false);

/**
 * Returns the shared admin navigation drawer state.
 *
 * @returns An object containing `drawerOpen`, a ref<boolean> that controls
 *          whether the mobile admin sidebar drawer is visible.
 */
export function useAdminNav() {
  return { drawerOpen };
}
