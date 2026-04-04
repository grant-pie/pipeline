import { ref } from 'vue'

const drawerOpen = ref(false)

export function useAdminNav() {
  return { drawerOpen }
}
