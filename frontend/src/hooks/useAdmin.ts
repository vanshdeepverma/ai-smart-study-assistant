import { useQuery } from '@tanstack/react-query';

export interface SystemStats {
  totalUsers: number;
  totalDocuments: number;
  totalQuizzes: number;
  totalStudyHours: number;
}

export function useAdminStats() {
  return useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      const data = await response.json();
      return data.data;
    },
  });
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: {
    documents: number;
  };
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }
      const data = await response.json();
      return data.data;
    },
  });
}
