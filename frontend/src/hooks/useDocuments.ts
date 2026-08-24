import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE_URL } from '../lib/api';

export interface Document {
  id: string;
  filename: string;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: string;
  metadata: {
    size: number;
    pages?: number;
    savedFilename: string;
  };
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<Document[]> => {
      const res = await apiFetch('/documents');
      return res.data;
    },
    // Poll every 3 seconds if any document is processing
    refetchInterval: (query) => {
      const isAnyProcessing = query.state.data?.some(doc => doc.status === 'PROCESSING');
      return isAnyProcessing ? 3000 : false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const url = `${API_BASE_URL}/documents`;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Needed for HttpOnly cookies
      });

      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/documents/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
