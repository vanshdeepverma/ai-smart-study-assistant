import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type MemoryCategory = 'CONCEPT_CONFUSION' | 'REPEATED_MISTAKE' | 'LEARNING_STRENGTH' | 'STUDY_PREFERENCE';

export interface LearningMemoryItem {
  id: string;
  userId: string;
  topic: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  evidence?: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export function useLearningMemories(isResolved?: boolean) {
  return useQuery<LearningMemoryItem[]>({
    queryKey: ['learningMemories', isResolved],
    queryFn: async () => {
      const queryParam = isResolved !== undefined ? `?isResolved=${isResolved}` : '';
      const res = await apiFetch(`/mentor/memories${queryParam}`);
      return res.data;
    }
  });
}

export function useDeleteLearningMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await apiFetch(`/mentor/memories/${memoryId}`, {
        method: 'DELETE'
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningMemories'] });
      queryClient.invalidateQueries({ queryKey: ['mentorProfile'] });
    }
  });
}

export function useToggleMemoryResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memoryId, isResolved }: { memoryId: string; isResolved: boolean }) => {
      const res = await apiFetch(`/mentor/memories/${memoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isResolved })
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningMemories'] });
      queryClient.invalidateQueries({ queryKey: ['mentorProfile'] });
    }
  });
}
