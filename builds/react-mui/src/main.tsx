import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TicketsScreen } from './TicketsScreen.js';
import './styles.css';

const theme = createTheme();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TicketsScreen />
    </ThemeProvider>
  </StrictMode>,
);
