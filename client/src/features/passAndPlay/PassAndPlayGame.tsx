import { useEffect, useState } from 'react';
import { usePassAndPlayStore } from './store/passAndPlayStore';
import { usePrivacyGuard } from './hooks/usePrivacyGuard';
import { usePnPNavGuard } from './hooks/usePnPNavGuard';
import SetupScreen from './components/SetupScreen';
import RoleRevealOrchestrator from './components/RoleRevealOrchestrator';
import CluePhaseScreen from './components/CluePhaseScreen';
import DiscussionScreen from './components/DiscussionScreen';
import VoteOrchestrator from './components/VoteOrchestrator';
import EliminationScreen from './components/EliminationScreen';
import MrWhiteGuessScreen from './components/MrWhiteGuessScreen';
import GameOverScreen from './components/GameOverScreen';
import PrivacyGuard from './components/PrivacyGuard';
import ExitConfirmDialog from './components/ExitConfirmDialog';

export default function PassAndPlayGame() {
  const {
    phase,
    revealSubPhase,
    initGame,
    loadFromStorage,
    resetGame,
  } = usePassAndPlayStore();

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [resumeDialogShown, setResumeDialogShown] = useState(false);

  console.log('[PassAndPlayGame] Rendered with phase:', phase, 'revealSubPhase:', revealSubPhase);

  const privacyGuard = usePrivacyGuard(phase, revealSubPhase);

  // Navigation guard
  usePnPNavGuard(
    phase !== 'SETUP' && phase !== 'GAME_OVER',
    () => setShowExitDialog(true)
  );

  // Try to restore saved game on mount
  useEffect(() => {
    const restored = loadFromStorage();
    if (restored && !resumeDialogShown) {
      setResumeDialogShown(true);
      const shouldResume = window.confirm(
        'You have a game in progress. Resume?'
      );
      if (!shouldResume) {
        resetGame();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExit = () => {
    resetGame();
    setShowExitDialog(false);
    window.location.href = '/';
  };

  // Render current phase
  const renderPhase = () => {
    console.log('[PassAndPlayGame] renderPhase called, phase:', phase);
    switch (phase) {
      case 'SETUP':
        console.log('[PassAndPlayGame] Rendering SetupScreen');
        return <SetupScreen onStart={initGame} />;
      
      case 'ROLE_REVEAL':
        return <RoleRevealOrchestrator />;
      
      case 'CLUE_PHASE':
        return <CluePhaseScreen />;
      
      case 'DISCUSSION':
        return <DiscussionScreen />;
      
      case 'VOTING':
        return <VoteOrchestrator />;
      
      case 'ELIMINATION':
        return <EliminationScreen />;
      
      case 'MR_WHITE_GUESS':
        return <MrWhiteGuessScreen />;
      
      case 'GAME_OVER':
        return <GameOverScreen />;
      
      default:
        return <SetupScreen onStart={initGame} />;
    }
  };

  return (
    <>
      {renderPhase()}
      
      <PrivacyGuard
        visible={privacyGuard.covered}
        onDismiss={privacyGuard.dismiss}
      />
      
      <ExitConfirmDialog
        visible={showExitDialog}
        onConfirm={handleExit}
        onCancel={() => setShowExitDialog(false)}
      />
    </>
  );
}
