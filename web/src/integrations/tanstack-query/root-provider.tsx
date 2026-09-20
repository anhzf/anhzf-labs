import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FirebaseError } from "firebase/app";
import type { ReactNode } from 'react';

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        throwOnError: (error) => {
          if (import.meta.env.DEV
            && error instanceof FirebaseError
            && error.code === 'failed-precondition') {
            console.error(error, { error });
          }
          return true;
        },
      }
    }
  });

  return {
    queryClient,
  };
}

export default function TanstackQueryProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
