import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface RecommendationCard {
  id: string;
  topicName: string;
  title: string;
  reason: string;
  actionType: 'PRACTICE_QUIZ' | 'REVISE_DOCUMENT' | 'CONCEPT_CHECK';
  targetId?: string;
  isDismissed: boolean;
  createdAt: string;
}

export interface WeakTopicItem {
  id: string;
  name: string;
  mastery: number;
  masteryLabel?: 'WEAK' | 'NEEDS_PRACTICE' | 'GOOD' | 'STRONG';
  evidenceSummary?: string;
  color: string;
  text: string;
}

export interface DashboardStats {
  userName?: string;
  totalDocuments: number;
  newDocumentsThisWeek: number;
  quizzesTaken: number;
  averageScore: number;
  studyTime: string;
  currentStreak: number;
  recentActivity: {
    id: string;
    title: string;
    timeAgo: string;
  }[];
  weakTopics: WeakTopicItem[];
  recommendations: RecommendationCard[];
  activeMemoriesCount: number;
}

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiFetch('/users/dashboard');
      const data = response.data || {};
      
      return {
        userName: data.userName || 'Student',
        totalDocuments: data.totalDocuments ?? 0,
        newDocumentsThisWeek: data.newDocumentsThisWeek ?? 0,
        quizzesTaken: data.quizzesTaken ?? 0,
        averageScore: data.averageScore ?? 0,
        studyTime: data.studyTime || '0h 0m',
        currentStreak: data.currentStreak ?? 0,
        recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        activeMemoriesCount: data.activeMemoriesCount ?? 0,
      };
    },
  });
}
