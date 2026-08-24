import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

export function useChatSessions() {
  return useQuery<ChatSession[]>({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      const response = await apiFetch('/chat/sessions');
      return response.data;
    },
  });
}
