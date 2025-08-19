import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { TimezoneProvider } from './contexts/TimezoneContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <TimezoneProvider>
          <App />
        </TimezoneProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>
);
