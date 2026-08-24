import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface DocumentFocusData {
  focusedDocumentId: string | null;
  focusedDocument: {
    id: string;
    filename: string;
    status: string;
  } | null;
}

export function useDocumentFocus(sessionId: string | undefined) {
  return useQuery<DocumentFocusData>({
    queryKey: ['sessionFocus', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return { focusedDocumentId: null, focusedDocument: null };
      }
      const res = await apiFetch(`/chat/sessions/${sessionId}/focus`);
      return res.data;
    },
    enabled: !!sessionId
  });
}

export function useUpdateDocumentFocus(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string | null) => {
      if (!sessionId) {
        throw new Error('No active sessionId for focus update');
      }
      const res = await apiFetch(`/chat/sessions/${sessionId}/focus`, {
        method: 'PATCH',
        body: JSON.stringify({ documentId })
      });
      return res.data as DocumentFocusData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionFocus', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    }
  });
}
