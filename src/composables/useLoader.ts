import { ref } from 'vue'

/** Wrap an async call with loading / error state. */
export function useLoader() {
  const loading = ref(false)
  const error = ref('')

  async function run<R>(fn: () => Promise<R>): Promise<R | undefined> {
    loading.value = true
    error.value = ''
    try {
      return await fn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return { loading, error, run }
}
