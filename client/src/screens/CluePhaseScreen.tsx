import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useRoomStore } from '../stores/roomStore';
import { socket } from '../stores/roomStore';
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

  return { display: secs < 0 ? 'No timer' : `${secs}`, secs };
}

// Circular timer ring
function TimerRing({ secs, total = 60, color }: { secs: number; total?: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, secs / total) : 1;
  const dash = pct * circ;

  return (
    <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="72" height="72" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 600, color, position: 'relative', zIndex: 1 }}>
        {secs < 0 ? '∞' : secs}
      </span>
    </div>
  );
}

export default function CluePhaseScreen() {
  const { gameState } = useGameStore();
  const { players } = useRoomStore();

  const [clueLog, setClueLog] = useState<ClueEntry[]>(() => gameState?.clueLog ?? []);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(() => gameState?.currentTurnPlayerId ?? null);
  const [endsAt, setEndsAt] = useState<number | null>(() => gameState?.phaseEndsAt ?? null);
  const [clueInput, setClueInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { display, secs } = useCountdown(endsAt);
  const timerColor = secs >= 0 && secs <= 5 ? '#e84b4b' : '#e8c547';

  const myId = socket.id;
  const isMyTurn = currentTurnPlayerId === myId;
  const currentRound = gameState?.round ?? 1;

  useEffect(() => {
    function onClueSubmitted({ entry }: { entry: ClueEntry }) {
      setClueLog((prev) => {
        if (prev.some((e) => e.playerId === entry.playerId && e.timestamp === entry.timestamp)) return prev;
        return [...prev, entry];
      });
    }
    function onTurnChanged({ playerId, endsAt: newEndsAt }: { playerId: string; endsAt: number | null }) {
      setCurrentTurnPlayerId(playerId);
      setEndsAt(newEndsAt);
      setSubmitting(false);
      setClueInput('');
    }
    socket.on('game:clue_submitted', onClueSubmitted);
    socket.on('game:turn_changed', onTurnChanged);
    return () => {
      socket.off('game:clue_submitted', onClueSubmitted);
      socket.off('game:turn_changed', onTurnChanged);
    };
  }, []);

  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  function handleSubmit() {
    const trimmed = clueInput.trim();
    if (!trimmed || !isMyTurn || submitting) return;
    setSubmitting(true);
    socket.emit('game:clue_submit', { clue: trimmed });
  }

  function getNickname(id: string) {
    return players.find((p) => p.id === id)?.nickname ?? id;
  }

  const currentRoundLog = clueLog.filter((e) => e.round === currentRound);

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e3e2e8', display: 'flex', flexDirection: 'column', padding: '20px 20px 100px' }}>
      {/* Round indicator */}
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.15em', margin: '0 0 20px', textTransform: 'uppercase' }}>
        ROUND {currentRound} // CLUE PHASE
      </p>

      {/* Timer + active player */}
      <div style={{
        background: '#12141c',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: isMyTurn ? '3px solid #e8c547' : '3px solid transparent',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'border-left-color 300ms ease',
      }}>
        <TimerRing secs={secs} total={60} color={timerColor} />
        <div style={{ flex: 1 }}>
          {currentTurnPlayerId ? (
            isMyTurn ? (
              <>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#e8c547', margin: '0 0 2px' }}>YOUR TURN</p>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: 0, letterSpacing: '0.05em' }}>Give a one-word clue</p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', margin: '0 0 2px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>INTERROGATING</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#e3e2e8', margin: 0 }}>
                  {getNickname(currentTurnPlayerId)}
                </p>
              </>
            )
          ) : (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.1em' }}>WAITING TO START…</p>
          )}
        </div>
      </div>

      {/* Clue log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', marginBottom: 16 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          CLUES THIS ROUND
        </p>
        {currentRoundLog.length === 0 ? (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4a5068', textAlign: 'center', padding: '24px 0' }}>
            No clues yet
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
                transition={{ duration: 0.2 }}
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
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          ref={inputRef}
          type="text"
          value={clueInput}
          onChange={(e) => setClueInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={!isMyTurn || submitting}
          placeholder={isMyTurn ? 'Type your clue…' : 'Wait for your turn'}
          maxLength={60}
          style={{
            flex: 1,
            height: 52,
            background: '#12141c',
            border: `1px solid ${isMyTurn ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 12,
            padding: '0 16px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            color: '#e3e2e8',
            outline: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => { if (isMyTurn) e.currentTarget.style.borderColor = '#e8c547'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = isMyTurn ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.07)'; }}
        />
        <button
          onClick={handleSubmit}
          disabled={!isMyTurn || submitting || !clueInput.trim()}
          style={{
            height: 52,
            padding: '0 20px',
            background: isMyTurn && !submitting && clueInput.trim() ? 'linear-gradient(135deg, #ffe285, #e8c547)' : '#1a1b20',
            border: 'none',
            borderRadius: 12,
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 13,
            color: isMyTurn && !submitting && clueInput.trim() ? '#000' : '#4a5068',
            cursor: isMyTurn && !submitting && clueInput.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 150ms ease',
            letterSpacing: '0.05em',
          }}
        >
          {submitting ? '…' : 'SEND'}
        </button>
      </div>
    </div>
  );
}
