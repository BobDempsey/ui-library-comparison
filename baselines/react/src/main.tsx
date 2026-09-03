import { createRoot } from 'react-dom/client';

/**
 * Mounts React and renders nothing. Its gzipped size is the framework floor
 * subtracted from every React build's total, so the number compared across all
 * eight is library weight rather than React weight. Never published.
 */
createRoot(document.getElementById('root') as HTMLElement).render(null);
