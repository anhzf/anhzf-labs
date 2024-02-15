export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:error', (err) => {
    if (err instanceof Error) {
      const toast = useToast();

      if (import.meta.browser) {
        const msg = err.message || String(err);
        toast.add({ title: msg, color: 'red' });
      }

      if (Array.isArray(err.cause)
        && err.cause.some((cause) => ['system', 'client'].includes(cause))) {
        clearError();
      } else {
        console.error(err);
      }
    }
  });

  usePinia();
});
