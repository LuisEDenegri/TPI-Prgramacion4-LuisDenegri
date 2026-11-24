import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // un 401 o un 403 no se arreglan reintentando
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
