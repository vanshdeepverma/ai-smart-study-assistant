import { useQuery } from '@tanstack/react-query';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  document?: {
    filename: string;
  };
}

export function useFlashcards() {
  return useQuery<Flashcard[]>({
    queryKey: ['flashcards'],
    queryFn: async () => {
      const response = await fetch('/api/v1/flashcards');
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards');
      }
      const data = await response.json();
      return data.data;
    },
  });
}
