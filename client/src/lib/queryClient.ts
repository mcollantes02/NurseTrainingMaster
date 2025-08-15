import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add Firebase auth token if user is authenticated
  if (auth.currentUser) {
    try {
      // Force refresh the token to ensure it's valid
      const token = await auth.currentUser.getIdToken(true);
      headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting auth token:', error);
      // If token fails, try to refresh the auth state
      throw new Error('Authentication failed');
    }
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add Firebase auth token if user is authenticated
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting auth token for query:', error);
        if (unauthorizedBehavior === "throw") {
          throw new Error('Authentication failed');
        }
      }
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      staleTime: 30 * 1000, // 30 segundos - más agresivo para nuevas preguntas
      gcTime: 2 * 60 * 1000, // 2 minutos
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Siempre refetch al montar
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});