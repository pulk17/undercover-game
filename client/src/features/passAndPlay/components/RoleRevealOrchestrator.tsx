import { usePassAndPlayStore } from '../store/passAndPlayStore';
import RoleRevealCover from './RoleRevealCover';
import RoleRevealTapToShow from './RoleRevealTapToShow';
import RoleRevealVisible from './RoleRevealVisible';
import RoleRevealHidden from './RoleRevealHidden';

export default function RoleRevealOrchestrator() {
  const {
    players,
    revealSubPhase,
    revealPlayerIndex,
    revealPeekUsed,
    revealTimerStart,
    advanceRevealCover,
    advanceRevealTap,
    autoHideWord,
    peekWord,
    confirmWordSeen,
    forceRevealCover,
  } = usePassAndPlayStore();

  const currentPlayer = players[revealPlayerIndex];

  if (!currentPlayer) return null;

  switch (revealSubPhase) {
    case 'COVER':
      return (
        <RoleRevealCover
          playerName={currentPlayer.name}
          onReady={advanceRevealCover}
        />
      );

    case 'TAP_TO_SHOW':
      return (
        <RoleRevealTapToShow
          playerName={currentPlayer.name}
          onTap={advanceRevealTap}
        />
      );

    case 'VISIBLE':
      return (
        <RoleRevealVisible
          word={currentPlayer.word}
          role={currentPlayer.role}
          timerStart={revealTimerStart!}
          onComplete={autoHideWord}
          onCoverQuickly={forceRevealCover}
        />
      );

    case 'HIDDEN':
      return (
        <RoleRevealHidden
          playerName={currentPlayer.name}
          canPeek={!revealPeekUsed}
          onPeek={peekWord}
          onConfirm={confirmWordSeen}
        />
      );

    default:
      return null;
  }
}
