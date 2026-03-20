import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  return { display: secs < 0 ? '∞' : `${secs}`, secs };
}

export default function DiscussionPhaseScreen() {
  const { gameState } = useGameStore();
  const { players, isHost } = useRoomStore();

  const [clueLog, setClueLog] = useState<ClueEntry[]>(() => gameState?.clueLog ?? []);
  const [endsAt, setEndsAt] = useState<number | null>(() => gameState?.phaseEndsAt ?? null);
  const [earlyVoteCount, setEarlyVoteCount] = useState(0);
  const [earlyVoteRequired, setEarlyVoteRequired] = useState(0);
  const [hasRequestedEarlyVote, setHasRequestedEarlyVote] = useState(false);

  const { display: countdown, secs } = useCountdown(endsAt);
  const isTimed = endsAt !== null;
  const timerRed = secs >= 0 && secs <= 10;

  const activePlayers = gameState?.activePlayers ?? [];
  const majority = Math.ceil(activePlayers.length / 2);

  useEffect(() => {
    function onTimerUpdate({ phaseEndsAt }: { phaseEndsAt: number | null }) {
      setEndsAt(phaseEndsAt);
    }
    function onEarlyVoteUpdate({ requestCount, required }: { requestCount: number; required: number; requestedBy: string }) {
      setEarlyVoteCount(requestCount);
      setEarlyVoteRequired(required);
    }
    socket.on('game:timer_update', onTimerUpdate);
    socket.on('game:early_vote_update', onEarlyVoteUpdate);
    return () => {
      socket.off('game:timer_update', onTimerUpdate);
      socket.off('game:early_vote_update', onEarlyVoteUpdate);
    };
  }, []);

  useEffect(() => {
    if (gameState?.clueLog) setClueLog(gameState.clueLog);
    if (gameState?.phaseEndsAt !== undefined) setEndsAt(gameState.phaseEndsAt);
  }, [gameState?.clueLog, gameState?.phaseEndsAt]);

  function handleEarlyVote() {
    if (hasRequestedEarlyVote) return;
    setHasRequestedEarlyVote(true);
    socket.emit('game:request_early_vote');
  }

  const currentRound = gameState?.round ?? 1;
  const currentRoundLog = clueLog.filter((e) => e.round === currentRound);
  const displayCount = earlyVoteCount || 0;
  const displayRequired = earlyVoteRequired || majority;

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e3e2e8', display: 'flex', flexDirection: 'column', padding: '20px 20px 100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.15em', margin: 0, textTransform: 'uppercase' }}>
          ROUND {currentRound} // DISCUSSION
        </p>
        {isTimed && (
          <motion.span
            animate={timerRed ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 22,
              fontWeight: 600,
              color: timerRed ? '#e84b4b' : '#e8c547',
              letterSpacing: '0.05em',
            }}
          >
            {countdown}s
          </motion.span>
        )}
      </div>

      {/* Unlimited mode label */}
      {!isTimed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div className="pulse-dot" style={{ background: '#3ecfb0' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.1em' }}>
            UNLIMITED DISCUSSION
          </span>
        </div>
      )}

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
              <motion.div
                key={`${entry.playerId}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: '#12141c',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color, flexShrink: 0 }}>{entry.nickname}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#e3e2e8', flex: 1 }}>
                  {entry.clue ?? <em style={{ color: '#4a5068' }}>skipped</em>}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Early vote request — available to all active players */}
      <AnimatePresence>
        {displayCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              background: 'rgba(232,197,71,0.06)',
              border: '1px solid rgba(232,197,71,0.2)',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e8c547', letterSpacing: '0.08em' }}>
              VOTE NOW REQUEST
            </span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#e8c547', fontWeight: 600 }}>
              {displayCount} / {displayRequired}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Early vote button — all active players */}
        <button
          onClick={handleEarlyVote}
          disabled={hasRequestedEarlyVote}
          style={{
            height: 48,
            background: hasRequestedEarlyVote ? 'rgba(232,197,71,0.08)' : 'transparent',
            border: `1px solid ${hasRequestedEarlyVote ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 12,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: hasRequestedEarlyVote ? '#e8c547' : '#8c8a85',
            cursor: hasRequestedEarlyVote ? 'default' : 'pointer',
            letterSpacing: '0.08em',
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {hasRequestedEarlyVote ? (
            <>
              <div className="pulse-dot" style={{ background: '#e8c547', width: 6, height: 6 }} />
              VOTE NOW REQUESTED ({displayCount}/{displayRequired})
            </>
          ) : (
            '🗳 VOTE NOW'
          )}
        </button>

        {/* Host controls */}
        {isHost && (
          <div style={{ display: 'flex', gap: 8 }}>
            {isTimed && (
              <button
                onClick={() => socket.emit('host:extend_discussion')}
                style={{
                  flex: 1,
                  height: 48,
                  background: 'transparent',
                  border: '1px solid rgba(62,207,176,0.3)',
                  borderRadius: 12,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  color: '#3ecfb0',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  transition: 'all 150ms ease',
                }}
              >
                +30s
              </button>
            )}
            <button
              onClick={() => socket.emit('host:end_discussion')}
              className="btn-primary"
              style={{ flex: isTimed ? 2 : 1, height: 48 }}
            >
              END DISCUSSION →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
