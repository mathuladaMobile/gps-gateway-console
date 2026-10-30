import { reactive } from 'vue'

const state = reactive({ show: false, text: '', color: 'success' })

export function useNotify() {
  function notify(text: string, color = 'success') {
    Object.assign(state, { show: true, text, color })
  }
  return {
    state,
    success: (text: string) => notify(text, 'success'),
    error: (e: unknown) => notify(e instanceof Error ? e.message : String(e), 'error'),
  }
}
