import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  document?: {
    filename: string;
  };
  progress?: { rating: string }[];
}

export function useFlashcards() {
  return useQuery<Flashcard[]>({
    queryKey: ['flashcards'],
    queryFn: async () => {
      const data = await apiFetch('/flashcards');
      return data.data;
    },
  });
}

export function useGenerateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, difficulty }: { documentId: string; difficulty: string }) => {
      const data = await apiFetch('/flashcards/generate', {
        method: 'POST',
        body: JSON.stringify({ documentId, difficulty }),
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useDeleteFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await apiFetch(`/flashcards/${id}`, {
        method: 'DELETE',
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useRateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: 'HARD' | 'GOOD' | 'EASY' }) => {
      const data = await apiFetch(`/flashcards/${id}/rating`, {
        method: 'PATCH',
        body: JSON.stringify({ rating }),
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}
