import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useRoomStore, socket } from '../stores/roomStore';

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

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
}

interface VotesRevealedPayload {
  tally: Record<string, number>;
  eliminatedPlayerId: string | null;
  isTie: boolean;
}

export default function VotingScreen() {
  const { gameState } = useGameStore();
  const { players } = useRoomStore();

  const [endsAt] = useState<number | null>(() => gameState?.phaseEndsAt ?? null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votedPlayerIds, setVotedPlayerIds] = useState<Set<string>>(new Set());
  const [tally, setTally] = useState<Record<string, number> | null>(null);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState<string | null>(null);
  const [isTie, setIsTie] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { display: countdown, secs } = useCountdown(endsAt);
  const timerRed = secs >= 0 && secs <= 5;
  const myId = socket.id;
  const activePlayers = gameState?.activePlayers ?? [];
  const currentRound = gameState?.round ?? 1;

  useEffect(() => {
    function onVoteCast({ voterId }: { voterId: string }) {
      setVotedPlayerIds((prev) => new Set(prev).add(voterId));
    }
    function onVotesRevealed({ tally: t, eliminatedPlayerId: elim, isTie: tie }: VotesRevealedPayload) {
      setTally(t); setEliminatedPlayerId(elim); setIsTie(tie); setRevealed(true);
    }
    function onTieBroken({ eliminatedPlayerId: elim }: { eliminatedPlayerId: string }) {
      setEliminatedPlayerId(elim); setIsTie(false);
    }
    socket.on('game:vote_cast', onVoteCast);
    socket.on('game:votes_revealed', onVotesRevealed);
    socket.on('game:tie_broken', onTieBroken);
    return () => {
      socket.off('game:vote_cast', onVoteCast);
      socket.off('game:votes_revealed', onVotesRevealed);
      socket.off('game:tie_broken', onTieBroken);
    };
  }, []);

  function handleVote(targetId: string) {
    if (myVote !== null || targetId === myId) return;
    setMyVote(targetId);
    socket.emit('game:vote_cast', { targetId });
  }

  function getNickname(id: string) {
    return players.find((p) => p.id === id)?.nickname ?? id;
  }

  const hasVoted = myVote !== null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      color: '#e3e2e8',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 20px 100px',
      // Slightly boosted noise on voting screen — handled via inline filter
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e84b4b', margin: 0, letterSpacing: '-0.01em' }}>
          VOTE TO ELIMINATE
        </h1>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.1em' }}>
          ROUND {currentRound}
        </span>
      </div>

      {/* Countdown */}
      {endsAt !== null && !revealed && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <motion.span
            animate={timerRed ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 32,
              fontWeight: 600,
              color: timerRed ? '#e84b4b' : '#e3e2e8',
              letterSpacing: '0.05em',
            }}
          >
            {countdown}s
          </motion.span>
        </div>
      )}

      {/* Status banner */}
      <div style={{
        background: '#12141c',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 20,
        textAlign: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {revealed ? (
          isTie && eliminatedPlayerId === null ? (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e8c547', letterSpacing: '0.08em' }}>
              TIE — NO ELIMINATION THIS ROUND
            </span>
          ) : eliminatedPlayerId ? (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e84b4b', letterSpacing: '0.08em' }}>
              {getNickname(eliminatedPlayerId).toUpperCase()} HAS BEEN ELIMINATED
            </span>
          ) : (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85' }}>VOTES REVEALED</span>
          )
        ) : hasVoted ? (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85', letterSpacing: '0.05em' }}>
            VOTED FOR <span style={{ color: '#e8c547' }}>{getNickname(myVote!).toUpperCase()}</span> — AWAITING OTHERS
          </span>
        ) : (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85', letterSpacing: '0.05em' }}>
            SELECT A TARGET TO ELIMINATE
          </span>
        )}
      </div>

      {/* Player grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
        {activePlayers.map((playerId) => {
          const isSelf = playerId === myId;
          const isSelected = myVote === playerId;
          const isDisabled = isSelf || hasVoted;
          const playerHasVoted = votedPlayerIds.has(playerId);
          const voteCount = revealed && tally ? (tally[playerId] ?? 0) : null;
          const isEliminated = revealed && eliminatedPlayerId === playerId;
          const nickname = getNickname(playerId);
          const initials = nickname.slice(0, 2).toUpperCase();

          return (
            <motion.button
              key={playerId}
              onClick={() => !isDisabled && handleVote(playerId)}
              disabled={isDisabled}
              whileTap={isDisabled ? {} : { scale: 0.97 }}
              style={{
                background: isEliminated ? 'rgba(232,75,75,0.08)' : isSelected ? 'rgba(232,75,75,0.08)' : '#12141c',
                border: `1px solid ${isEliminated ? '#e84b4b' : isSelected ? '#e84b4b' : 'rgba(255,255,255,0.07)'}`,
                borderLeft: isSelected || isEliminated ? '3px solid #e84b4b' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled && !isSelected ? 0.6 : 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'all 150ms ease',
                position: 'relative',
              }}
            >
              {/* Voted checkmark */}
              {playerHasVoted && (
                <span style={{ position: 'absolute', top: 8, right: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547' }}>✓</span>
              )}

              {/* Avatar */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isEliminated ? 'rgba(232,75,75,0.15)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                color: isEliminated ? '#e84b4b' : '#e3e2e8',
              }}>
                {initials}
              </div>

              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: isEliminated ? '#e84b4b' : '#e3e2e8', textAlign: 'center', lineHeight: 1.2 }}>
                {nickname.toUpperCase()}
              </span>

              {voteCount !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    color: isEliminated ? '#e84b4b' : '#e8c547',
                    background: isEliminated ? 'rgba(232,75,75,0.15)' : 'rgba(232,197,71,0.1)',
                    padding: '3px 10px',
                    borderRadius: 6,
                  }}
                >
                  <AnimatedCount value={voteCount} /> vote{voteCount !== 1 ? 's' : ''}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Vote count */}
      {!revealed && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', textAlign: 'center', marginTop: 16, letterSpacing: '0.1em' }}>
          {votedPlayerIds.size} / {activePlayers.length} VOTED
        </p>
      )}

      {/* Cast vote CTA — only shown when a target is selected */}
      {myVote && !revealed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
          <button className="btn-danger">
            VOTE CAST ✓
          </button>
        </motion.div>
      )}
    </div>
  );
}
