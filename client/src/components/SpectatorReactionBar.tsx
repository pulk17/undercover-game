import { useGameStore } from '../stores/gameStore';
import { socket } from '../stores/roomStore';

const REACTIONS = ['👀', '😂', '🔥', '😱', '👏', '🤔'];

export function SpectatorReactionBar() {
  const { gameState } = useGameStore();
  const myId = socket.id;

  // Only show for spectators (eliminated players)
  const isSpectator = myId ? (gameState?.spectators ?? []).includes(myId) : false;
  if (!isSpectator) return null;

  const sendReaction = (emoji: string) => {
    socket.emit('game:reaction', { emoji });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-white/10 flex justify-around py-2">
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => sendReaction(emoji)}
          className="min-h-[44px] min-w-[44px] text-2xl flex items-center justify-center rounded-lg active:scale-90 transition-transform"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
