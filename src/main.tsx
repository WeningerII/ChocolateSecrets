import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Self-hosted webfonts (ADR: no third-party font CDN — works offline in the
// kitchen and keeps client IPs off Google). Family names: "Fraunces Variable",
// "Inter Variable" — see tailwind.config fontFamily.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import App from './App.tsx';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
