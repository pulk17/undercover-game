import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useLocalGameStore } from '../stores/localGameStore';
import { useRoomStore, socket } from '../stores/roomStore';
import type { ClueEntry } from '../../../shared/types';

function useCountdown(endsAt: number | null): { display: string; secs: number } {
  const [secs, setSecs] = useState<number>(0);

  useEffect(() => {
    if (endsAt === null) {
      setSecs(-1);
      return;
    }
    const targetEndsAt = endsAt;

    function tick() {
      setSecs(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
    }

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  return { display: secs < 0 ? 'INF' : `${secs}`, secs };
}

const PLAYER_COLORS = ['#3ecfb0', '#e8c547', '#9b6fe8', '#e84b4b', '#60a5fa', '#f97316', '#a3e635', '#f472b6'];

function playerColor(playerId: string, allIds: string[]): string {
  const index = allIds.indexOf(playerId);
  return PLAYER_COLORS[(index < 0 ? 0 : index) % PLAYER_COLORS.length];
}

export default function DiscussionPhaseScreen() {
  const onlineGameState = useGameStore((state) => state.gameState);
  const { players: roomPlayers, isHost } = useRoomStore();
  const isLocalMode = useLocalGameStore((state) => state.isLocalMode);
  const localGameState = useLocalGameStore((state) => state.gameState);
  const endLocalDiscussion = useLocalGameStore((state) => state.endDiscussion);

  const gameState = isLocalMode ? localGameState : onlineGameState;
  const phaseEndsAt = isLocalMode ? null : onlineGameState?.phaseEndsAt ?? null;
  const players = isLocalMode ? localGameState?.players ?? [] : roomPlayers;

  const [clueLog, setClueLog] = useState<ClueEntry[]>(() => gameState?.clueLog ?? []);
  const [endsAt, setEndsAt] = useState<number | null>(() => phaseEndsAt);
  const [earlyVoteCount, setEarlyVoteCount] = useState(0);
  const [earlyVoteRequired, setEarlyVoteRequired] = useState(0);
  const [earlyVoteRequesters, setEarlyVoteRequesters] = useState<string[]>([]);

  const { display: countdown, secs } = useCountdown(endsAt);
  const isTimed = endsAt !== null;
  const timerRed = secs >= 0 && secs <= 10;

  const myId = socket.id ?? '';
  const activePlayers = gameState?.activePlayers ?? [];
  const allPlayerIds = players.map((player) => player.id);
  const majority = Math.ceil(activePlayers.length / 2);
  const hasRequestedEarlyVote = earlyVoteRequesters.includes(myId);

  useEffect(() => {
    if (isLocalMode) return;

    function onTimerUpdate({ phaseEndsAt }: { phaseEndsAt: number | null }) {
      setEndsAt(phaseEndsAt);
    }

    function onEarlyVoteUpdate({
      requestCount,
      required,
      requestedBy,
    }: {
      requestCount: number;
      required: number;
      requestedBy: string[];
    }) {
      setEarlyVoteCount(requestCount);
      setEarlyVoteRequired(required);
      setEarlyVoteRequesters(requestedBy);
    }

    function onClueSubmitted({ entry }: { entry: ClueEntry }) {
      setClueLog((prev) => {
        if (prev.some((existing) => existing.playerId === entry.playerId && existing.timestamp === entry.timestamp)) {
          return prev;
        }
        return [...prev, entry];
      });
    }

    socket.on('game:timer_update', onTimerUpdate);
    socket.on('game:early_vote_update', onEarlyVoteUpdate);
    socket.on('game:clue_submitted', onClueSubmitted);
    return () => {
      socket.off('game:timer_update', onTimerUpdate);
      socket.off('game:early_vote_update', onEarlyVoteUpdate);
      socket.off('game:clue_submitted', onClueSubmitted);
    };
  }, [isLocalMode]);

  useEffect(() => {
    if (gameState?.clueLog) setClueLog(gameState.clueLog);
    setEndsAt(phaseEndsAt);
  }, [gameState?.clueLog, phaseEndsAt]);

  function handleEarlyVote() {
    if (hasRequestedEarlyVote || isLocalMode) return;
    socket.emit('game:request_early_vote');
  }

  function handleEndDiscussion() {
    if (isLocalMode) {
      endLocalDiscussion();
      return;
    }
    socket.emit('host:end_discussion');
  }

  const currentRound = gameState?.round ?? 1;
  const currentRoundLog = clueLog.filter((entry) => entry.round === currentRound);
  const displayCount = earlyVoteCount || 0;
  const displayRequired = earlyVoteRequired || majority;

  useEffect(() => {
    setEarlyVoteCount(0);
    setEarlyVoteRequired(0);
    setEarlyVoteRequesters([]);
  }, [currentRound, gameState?.phase]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#e3e2e8',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 20px 100px',
        overflowX: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: '#4a5068',
            letterSpacing: '0.15em',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Round {currentRound} / Discussion
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

      {!isTimed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div className="pulse-dot" style={{ background: '#3ecfb0' }} />
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#4a5068',
              letterSpacing: '0.1em',
            }}
          >
            {isLocalMode ? 'LOCAL DISCUSSION' : 'UNLIMITED DISCUSSION'}
          </span>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', marginBottom: 16 }}>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}
        >
          Clues This Round
        </p>
        {currentRoundLog.length === 0 ? (
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#4a5068',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            No clues submitted
          </p>
        ) : (
          currentRoundLog.map((entry, index) => {
            const color = playerColor(entry.playerId, allPlayerIds);
            return (
              <motion.div
                key={`${entry.playerId}-${index}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
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
                <span
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    color,
                    flexShrink: 0,
                    maxWidth: '40%',
                    overflowWrap: 'break-word',
                  }}
                >
                  {entry.nickname}
                </span>
                <span
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 13,
                    color: '#e3e2e8',
                    flex: 1,
                    overflowWrap: 'break-word',
                  }}
                >
                  {entry.clue ?? <em style={{ color: '#4a5068' }}>skipped</em>}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {!isLocalMode && displayCount > 0 && (
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
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#e8c547',
                letterSpacing: '0.08em',
              }}
            >
              Vote Now Request
            </span>
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 13,
                color: '#e8c547',
                fontWeight: 600,
              }}
            >
              {displayCount} / {displayRequired}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!isLocalMode && (
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
            {hasRequestedEarlyVote
              ? `VOTE NOW REQUESTED (${displayCount}/${displayRequired})`
              : 'VOTE NOW'}
          </button>
        )}

        {(isHost || isLocalMode) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLocalMode && isTimed && (
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
              onClick={handleEndDiscussion}
              className="btn-primary"
              style={{ flex: isTimed && !isLocalMode ? 2 : 1, height: 48 }}
            >
              End Discussion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
