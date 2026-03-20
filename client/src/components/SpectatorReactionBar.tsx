import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useRoomStore, socket } from '../stores/roomStore';

const REACTIONS = ['😂', '😭', '🤡', '💀', '👀', '🤯', '🙃', '😹'];
const REACTION_LIFETIME_MS = 4200;

interface BroadcastReaction {
  id: string;
  emoji: string;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  timestamp: number;
}

export function SpectatorReactionBar() {
  const gameState = useGameStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const [liveReactions, setLiveReactions] = useState<BroadcastReaction[]>([]);

  const canReact = useMemo(() => {
    if (!gameState) return false;
    return gameState.phase !== 'lobby' && gameState.phase !== 'game_over';
  }, [gameState]);

  useEffect(() => {
    function onReaction(reaction: BroadcastReaction) {
      setLiveReactions((current) => [...current.slice(-3), reaction]);
      window.setTimeout(() => {
        setLiveReactions((current) => current.filter((entry) => entry.id !== reaction.id));
      }, REACTION_LIFETIME_MS);
    }

    socket.on('game:reaction', onReaction);
    return () => {
      socket.off('game:reaction', onReaction);
    };
  }, []);

  function sendReaction(emoji: string) {
    if (!canReact) return;
    socket.emit('game:reaction', { emoji });
  }

  return (
    <>
      <AnimatePresence>
        {liveReactions.map((reaction, index) => {
          const player = players.find((entry) => entry.id === reaction.playerId);
          const initials = reaction.nickname.slice(0, 2).toUpperCase();

          return (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, x: 40, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 40, y: -12 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'fixed',
                right: 12,
                top: 92 + index * 76,
                zIndex: 80,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(18,20,28,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '10px 12px',
                boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)',
                maxWidth: 220,
              }}
            >
              {player?.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={reaction.nickname}
                  style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'rgba(232,197,71,0.14)',
                    border: '1px solid rgba(232,197,71,0.24)',
                    color: '#e8c547',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 10,
                    color: '#8c8a85',
                    margin: '0 0 3px',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {reaction.nickname}
                </p>
                <div style={{ fontSize: 24, lineHeight: 1 }}>{reaction.emoji}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {canReact && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            background: 'rgba(18,20,28,0.96)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            gap: 6,
          }}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              style={{
                minWidth: 40,
                minHeight: 40,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#12141c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
              }}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
