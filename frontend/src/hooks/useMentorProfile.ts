import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface StudentProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  profile: {
    preferredStyle: 'ANALOGY' | 'STEP_BY_STEP' | 'FORMAL';
    academicGoal: string;
    updatedAt: string;
  };
  stats: {
    totalDocuments: number;
    readyDocuments: number;
    totalChatSessions: number;
    totalChatMessages: number;
    totalQuizzesAttempted: number;
    averageQuizScore: number | null;
  };
  activity: {
    recentDocuments: Array<{ id: string; filename: string; updatedAt: string }>;
    recentConversations: Array<{ id: string; title: string; updatedAt: string; messageCount: number }>;
    recentQuizAttempts: Array<{ id: string; quizTitle: string; documentName: string; score: number; completedAt: string }>;
  };
  mastery: {
    topicsNeedingPractice: Array<{ title: string; score: number }>;
    strongTopics: Array<{ title: string; score: number }>;
  };
}

export function useMentorProfile() {
  return useQuery<StudentProfileData>({
    queryKey: ['mentorProfile'],
    queryFn: async () => {
      const res = await apiFetch('/mentor/profile');
      return res.data;
    }
  });
}

export function useUpdateMentorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { preferredStyle?: string; academicGoal?: string }) => {
      const res = await apiFetch('/mentor/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorProfile'] });
    }
  });
}
