import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface Question {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizAttempt {
  id: string;
  score: number;
  startedAt: string;
  completedAt?: string;
  answers?: Array<{
    id: string;
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    question?: Question;
  }>;
}

export interface Quiz {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  createdAt: string;
  document?: {
    id: string;
    filename: string;
  };
  questions?: Question[];
  attempts?: QuizAttempt[];
  _count?: {
    questions: number;
    attempts: number;
  };
}

export function useQuizzes() {
  return useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const response = await apiFetch('/quizzes');
      return response.data;
    },
  });
}

export function useQuizDetail(quizId: string | null) {
  return useQuery<Quiz>({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) throw new Error('No quizId provided');
      const response = await apiFetch(`/quizzes/${quizId}`);
      return response.data;
    },
    enabled: !!quizId,
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, difficulty }: { documentId: string; difficulty?: string }) => {
      const response = await apiFetch('/quizzes/generate', {
        method: 'POST',
        body: JSON.stringify({ documentId, difficulty })
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    }
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: Array<{ questionId: string; selectedOption: string }> }) => {
      const response = await apiFetch(`/quizzes/${quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['quiz', variables.quizId] });
    }
  });
}
