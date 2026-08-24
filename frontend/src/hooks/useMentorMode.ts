import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type MentorModeType = 'EXPLAIN' | 'SOCRATIC' | 'EXAM' | 'VIVA' | 'DOUBT' | 'STUDY';

export interface MentorModeData {
  mentorMode: MentorModeType;
  availableModes: MentorModeType[];
}

export function useMentorMode(sessionId: string | undefined) {
  return useQuery<MentorModeData>({
    queryKey: ['sessionMode', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return { mentorMode: 'EXPLAIN', availableModes: ['EXPLAIN', 'SOCRATIC', 'EXAM', 'VIVA', 'DOUBT', 'STUDY'] };
      }
      const res = await apiFetch(`/chat/sessions/${sessionId}/mode`);
      return res.data;
    },
    enabled: !!sessionId
  });
}

export function useUpdateMentorMode(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mode: MentorModeType) => {
      if (!sessionId) {
        throw new Error('No active sessionId for mode update');
      }
      const res = await apiFetch(`/chat/sessions/${sessionId}/mode`, {
        method: 'PATCH',
        body: JSON.stringify({ mode })
      });
      return res.data as MentorModeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionMode', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    }
  });
}
