export const useLoading = (init: boolean = false) => {
  const isLoading = ref(init);
  const loading = <T>(promise: Promise<T>) => {
    isLoading.value = true;
    return promise.finally(() => {
      isLoading.value = false;
    });
  };

  return {
    isLoading,
    loading,
  };
};
