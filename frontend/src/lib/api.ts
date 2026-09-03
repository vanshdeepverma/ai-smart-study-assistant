export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3000/api/v1` : 'http://localhost:3000/api/v1');

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Very important for HttpOnly cookies
    credentials: 'include',
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
