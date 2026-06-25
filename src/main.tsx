import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker for PWA support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js')
      .then((reg) => console.log('[PWA SW] Registered successfully:', reg.scope))
      .catch((err) => console.error('[PWA SW] Registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
