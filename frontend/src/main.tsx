import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { Toaster } from 'react-hot-toast';

import './index.css';
import App from './App.tsx';

// React Query client — handles caching, deduplication, background refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // cache data for 30s (fewer refetches — scalability)
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
