import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useViewerStore } from '@/store/viewerStore';
import '../styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Elemen #root tidak ditemukan di index.html');
}

if (import.meta.env.DEV) {
  // Expose store untuk debugging & uji memory-leak di konsol dev.
  (window as unknown as { __viewerStore?: unknown }).__viewerStore = useViewerStore;
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
