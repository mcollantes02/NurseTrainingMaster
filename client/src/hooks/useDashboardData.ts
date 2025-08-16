
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '../lib/queryClient';

interface DashboardData {
  questions: any[];
  mockExams: any[];
  subjects: any[];
  topics: any[];
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["/api/dashboard-data"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}
