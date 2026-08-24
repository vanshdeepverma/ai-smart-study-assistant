import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await apiFetch('/auth/me');
        return response.data;
      } catch (error) {
        // If 401, return null instead of throwing unhandled exception
        return null;
      }
    },
    retry: false, // Do not retry on 401s
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Clear the user from cache, forcing a redirect in protected routes
      queryClient.setQueryData(['currentUser'], null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}
