import { useEffect, useState } from 'react';
import type { PnPPhase, PnPRevealSubPhase } from '../../../../../shared/types';
import { usePassAndPlayStore } from '../store/passAndPlayStore';

/**
 * Privacy guard hook that monitors visibility changes
 * Forces cover screen when app is hidden during sensitive phases
 */
export function usePrivacyGuard(phase: PnPPhase, revealSubPhase: PnPRevealSubPhase) {
  const [covered, setCovered] = useState(false);
  const forceRevealCover = usePassAndPlayStore(state => state.forceRevealCover);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        // Screen hidden — record that we were covered
        setCovered(true);
        
        // If word was visible, force back to COVER state
        if (
          phase === 'ROLE_REVEAL' &&
          (revealSubPhase === 'VISIBLE' || revealSubPhase === 'TAP_TO_SHOW')
        ) {
          forceRevealCover();
        }
      } else {
        // Screen visible again — if we had covered, show the overlay
        // until user actively dismisses (taps "I'm back")
        // covered state is already true from above
      }
    }

    // Feature detect
    if ('hidden' in document) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    } else {
      console.warn('Page Visibility API not supported - privacy guard disabled');
    }
  }, [phase, revealSubPhase, forceRevealCover]);

  return {
    covered,
    dismiss: () => setCovered(false),
  };
}
