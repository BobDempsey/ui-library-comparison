import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TicketsScreen } from './TicketsScreen.js';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <TicketsScreen />
  </StrictMode>,
);
