import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useRoomStore, socket } from '../stores/roomStore';
import type { ClueEntry } from '../../../shared/types';

function useCountdown(endsAt: number | null): { display: string; secs: number } {
  const [secs, setSecs] = useState<number>(0);
  useEffect(() => {
    if (endsAt === null) { setSecs(-1); return; }
    function tick() { setSecs(Math.max(0, Math.ceil((endsAt! - Date.now()) / 1000))); }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  return { display: secs < 0 ? '' : `${secs}`, secs };
}

export default function DiscussionPhaseScreen() {
  const { gameState } = useGameStore();
  const { players, isHost } = useRoomStore();

  const [clueLog, setClueLog] = useState<ClueEntry[]>(() => gameState?.clueLog ?? []);
  const [endsAt, setEndsAt] = useState<number | null>(() => gameState?.phaseEndsAt ?? null);

  const { display: countdown, secs } = useCountdown(endsAt);
  const isTimed = endsAt !== null;
  const timerRed = secs >= 0 && secs <= 10;

  useEffect(() => {
    function onTimerUpdate({ phaseEndsAt }: { phaseEndsAt: number | null }) { setEndsAt(phaseEndsAt); }
    socket.on('game:timer_update', onTimerUpdate);
    return () => { socket.off('game:timer_update', onTimerUpdate); };
  }, []);

  useEffect(() => {
    if (gameState?.clueLog) setClueLog(gameState.clueLog);
  }, [gameState?.clueLog]);

  const currentRound = gameState?.round ?? 1;
  const currentRoundLog = clueLog.filter((e) => e.round === currentRound);

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e3e2e8', display: 'flex', flexDirection: 'column', padding: '20px 20px 100px' }}>
      {/* Round indicator */}
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.15em', margin: '0 0 20px', textTransform: 'uppercase' }}>
        ROUND {currentRound} // DISCUSSION
      </p>

      {/* Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        {isTimed ? (
          <motion.span
            animate={timerRed ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 48,
              fontWeight: 600,
              color: timerRed ? '#e84b4b' : '#e8c547',
              letterSpacing: '0.05em',
            }}
          >
            {countdown}s
          </motion.span>
        ) : (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#4a5068', letterSpacing: '0.1em' }}>
            UNLIMITED DISCUSSION
          </span>
        )}
      </div>

      {/* Clue log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', marginBottom: 16 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          CLUES THIS ROUND
        </p>
        {currentRoundLog.length === 0 ? (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4a5068', textAlign: 'center', padding: '24px 0' }}>
            No clues submitted
          </p>
        ) : (
          currentRoundLog.map((entry, i) => {
            const pIdx = players.findIndex((p) => p.id === entry.playerId);
            const color = ['#3ecfb0', '#e8c547', '#9b6fe8', '#e84b4b', '#60a5fa'][pIdx % 5];
            return (
              <div
                key={`${entry.playerId}-${i}`}
                style={{
                  background: '#12141c',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color, flexShrink: 0 }}>{entry.nickname}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#e3e2e8', flex: 1 }}>
                  {entry.clue ?? <em style={{ color: '#4a5068' }}>skipped</em>}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Host controls */}
      {isHost && (
        <div style={{ display: 'flex', gap: 10 }}>
          {isTimed && (
            <button
              onClick={() => socket.emit('host:extend_discussion')}
              style={{
                flex: 1,
                height: 48,
                background: 'transparent',
                border: '1px solid rgba(232,197,71,0.4)',
                borderRadius: 12,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#e8c547',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 150ms ease',
              }}
            >
              EXTEND +30s
            </button>
          )}
          {!isTimed && (
            <button
              onClick={() => socket.emit('host:end_discussion')}
              className="btn-primary"
            >
              END DISCUSSION →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
