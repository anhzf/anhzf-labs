import { useState } from 'react';

export function useLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const loading = async <T,>(promise: Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      return await promise;
    } finally {
      setIsLoading(false);
    }
  };

  return [isLoading, loading] as const;
}
