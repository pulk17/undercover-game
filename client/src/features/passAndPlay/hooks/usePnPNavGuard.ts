import { useEffect } from 'react';

/**
 * Navigation guard hook that prevents accidental exits
 * Blocks browser back button and shows confirmation on tab close
 */
export function usePnPNavGuard(enabled: boolean, onExitAttempt: () => void) {
  useEffect(() => {
    if (!enabled) return;

    // Block browser back button
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      onExitAttempt();
    };

    // Show confirmation on tab close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, onExitAttempt]);
}
