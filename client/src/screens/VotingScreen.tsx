import { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useLocalGameStore } from '../stores/localGameStore';
import { useRoomStore, socket } from '../stores/roomStore';

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

  return { display: secs < 0 ? '' : `${secs}`, secs };
}

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

interface VotesRevealedPayload {
  tally: Record<string, number>;
  eliminatedPlayerId: string | null;
  isTie?: boolean;
}

export default function VotingScreen() {
  const onlineGameState = useGameStore((state) => state.gameState);
  const roomPlayers = useRoomStore((state) => state.players);
  const isLocalMode = useLocalGameStore((state) => state.isLocalMode);
  const localGameState = useLocalGameStore((state) => state.gameState);
  const castLocalVote = useLocalGameStore((state) => state.castVote);

  const gameState = isLocalMode ? localGameState : onlineGameState;
  const phaseEndsAt = isLocalMode ? null : onlineGameState?.phaseEndsAt ?? null;
  const players = isLocalMode ? localGameState?.players ?? [] : roomPlayers;

  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [submittedVoteId, setSubmittedVoteId] = useState<string | null>(null);
  const [votedPlayerIds, setVotedPlayerIds] = useState<Set<string>>(new Set());
  const [tally, setTally] = useState<Record<string, number> | null>(null);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState<string | null>(null);
  const [isTie, setIsTie] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const endsAt = phaseEndsAt;
  const { display: countdown, secs } = useCountdown(endsAt);
  const timerRed = secs >= 0 && secs <= 5;
  const activePlayers = useMemo(() => gameState?.activePlayers ?? [], [gameState?.activePlayers]);
  const currentRound = gameState?.round ?? 1;

  const currentLocalVoterId = useMemo(() => {
    if (!isLocalMode) return null;
    const votedIds = new Set((localGameState?.votes ?? []).map((vote) => vote.voterId));
    return activePlayers.find((playerId) => !votedIds.has(playerId)) ?? null;
  }, [activePlayers, isLocalMode, localGameState?.votes]);

  const myId = isLocalMode ? currentLocalVoterId : socket.id;

  useEffect(() => {
    if (isLocalMode) {
      const votes = localGameState?.votes ?? [];
      const myLocalVote = currentLocalVoterId
        ? votes.find((vote) => vote.voterId === currentLocalVoterId)?.targetId ?? null
        : null;
      setSelectedVoteId(myLocalVote);
      setSubmittedVoteId(myLocalVote);
      setVotedPlayerIds(new Set(votes.map((vote) => vote.voterId)));
      if (gameState?.phase !== 'vote') {
        setRevealed(false);
      }
      return;
    }

    function onVoteCast({ voterId }: { voterId: string }) {
      setVotedPlayerIds((prev) => new Set(prev).add(voterId));
    }

    function onVotesRevealed({
      tally: nextTally,
      eliminatedPlayerId: nextEliminated,
      isTie: nextTie = false,
    }: VotesRevealedPayload) {
      setTally(nextTally);
      setEliminatedPlayerId(nextEliminated);
      setIsTie(nextTie);
      setRevealed(true);
    }

    function onTieBroken({ eliminatedPlayerId: nextEliminated }: { eliminatedPlayerId: string }) {
      setEliminatedPlayerId(nextEliminated);
      setIsTie(false);
    }

    socket.on('game:vote_cast', onVoteCast);
    socket.on('game:votes_revealed', onVotesRevealed);
    socket.on('game:tie_broken', onTieBroken);
    return () => {
      socket.off('game:vote_cast', onVoteCast);
      socket.off('game:votes_revealed', onVotesRevealed);
      socket.off('game:tie_broken', onTieBroken);
    };
  }, [currentLocalVoterId, gameState?.phase, isLocalMode, localGameState?.votes]);

  useEffect(() => {
    if (!isLocalMode) return;

    const votes = localGameState?.votes ?? [];
    const roundVotes = votes.filter((vote) => vote.round === currentRound);
    const roundTally = roundVotes.reduce<Record<string, number>>((acc, vote) => {
      acc[vote.targetId] = (acc[vote.targetId] ?? 0) + 1;
      return acc;
    }, {});

    if (gameState?.phase === 'elimination' || gameState?.phase === 'game_over' || gameState?.phase === 'mr_white_guess') {
      setTally(roundTally);
      setEliminatedPlayerId(gameState.eliminatedThisRound ?? null);
      setRevealed(roundVotes.length > 0);
    } else {
      setTally(null);
      setEliminatedPlayerId(null);
      setRevealed(false);
    }
  }, [currentRound, gameState?.eliminatedThisRound, gameState?.phase, isLocalMode, localGameState?.votes]);

  useEffect(() => {
    if (isLocalMode) {
      setSelectedVoteId(null);
      setSubmittedVoteId(null);
      return;
    }

    if (gameState?.phase !== 'vote') return;

    setSelectedVoteId(null);
    setSubmittedVoteId(null);
    setVotedPlayerIds(new Set());
    setTally(null);
    setEliminatedPlayerId(null);
    setIsTie(false);
    setRevealed(false);
  }, [currentRound, gameState?.phase, isLocalMode]);

  function handleVote(targetId: string) {
    if (submittedVoteId !== null || targetId === myId || !myId) return;
    setSelectedVoteId(targetId);
  }

  function handleSubmitVote() {
    if (!selectedVoteId || submittedVoteId !== null || !myId) return;

    setSubmittedVoteId(selectedVoteId);
    if (isLocalMode) {
      castLocalVote(myId, selectedVoteId);
      return;
    }

    socket.emit('game:vote_cast', { targetId: selectedVoteId });
  }

  function getNickname(id: string) {
    return players.find((player) => player.id === id)?.nickname ?? id;
  }

  const hasVoted = submittedVoteId !== null;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#e84b4b',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Vote To Eliminate
        </h1>
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: '#4a5068',
            letterSpacing: '0.1em',
          }}
        >
          ROUND {currentRound}
        </span>
      </div>

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

      <div
        style={{
          background: '#12141c',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          textAlign: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {revealed ? (
          isTie && eliminatedPlayerId === null ? (
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#e8c547',
                letterSpacing: '0.08em',
              }}
            >
              TIE - NO ELIMINATION THIS ROUND
            </span>
          ) : eliminatedPlayerId ? (
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#e84b4b',
                letterSpacing: '0.08em',
                overflowWrap: 'break-word',
              }}
            >
              {getNickname(eliminatedPlayerId).toUpperCase()} HAS BEEN ELIMINATED
            </span>
          ) : (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85' }}>
              VOTES REVEALED
            </span>
          )
        ) : isLocalMode && currentLocalVoterId ? (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#e8c547',
              letterSpacing: '0.05em',
              overflowWrap: 'break-word',
            }}
          >
            PASS TO {getNickname(currentLocalVoterId).toUpperCase()} TO VOTE
          </span>
        ) : hasVoted ? (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#8c8a85',
              letterSpacing: '0.05em',
              overflowWrap: 'break-word',
            }}
          >
              VOTED FOR <span style={{ color: '#e8c547' }}>{getNickname(submittedVoteId!).toUpperCase()}</span> - AWAITING OTHERS
            </span>
        ) : selectedVoteId ? (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#e8c547',
              letterSpacing: '0.05em',
              overflowWrap: 'break-word',
            }}
          >
            SELECTED <span style={{ color: '#fff' }}>{getNickname(selectedVoteId).toUpperCase()}</span> - TAP CONFIRM TO LOCK IT IN
          </span>
        ) : (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#8c8a85',
              letterSpacing: '0.05em',
            }}
          >
            SELECT A TARGET TO ELIMINATE
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
        {activePlayers.map((playerId) => {
          const isSelf = playerId === myId;
          const isSelected = selectedVoteId === playerId;
          const isDisabled = revealed || isSelf || hasVoted || (!isLocalMode && myId === undefined);
          const playerHasVoted = votedPlayerIds.has(playerId);
          const voteCount = revealed && tally ? tally[playerId] ?? 0 : null;
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
                background: isSelf
                  ? 'rgba(255,255,255,0.03)'
                  : isEliminated
                    ? 'rgba(232,75,75,0.08)'
                    : isSelected
                      ? 'rgba(232,75,75,0.08)'
                      : '#12141c',
                border: `1px solid ${
                  isSelf
                    ? 'rgba(255,255,255,0.08)'
                    : isEliminated || isSelected
                      ? '#e84b4b'
                      : 'rgba(255,255,255,0.07)'
                }`,
                borderLeft: isSelected || isEliminated ? '3px solid #e84b4b' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isSelf ? 0.38 : isDisabled && !isSelected ? 0.6 : 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'all 150ms ease',
                position: 'relative',
              }}
            >
              {playerHasVoted && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 9,
                    color: '#e8c547',
                    letterSpacing: '0.08em',
                  }}
                >
                  VOTED
                </span>
              )}

              <div
                style={{
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
                  color: isEliminated ? '#e84b4b' : isSelf ? '#8c8a85' : '#e3e2e8',
                }}
              >
                {initials}
              </div>

              <span
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: isEliminated ? '#e84b4b' : isSelf ? '#8c8a85' : '#e3e2e8',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflowWrap: 'break-word',
                }}
              >
                {nickname.toUpperCase()}
                {isSelf ? ' (YOU)' : ''}
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

      {!revealed && (
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            textAlign: 'center',
            marginTop: 16,
            letterSpacing: '0.1em',
          }}
        >
          {votedPlayerIds.size} / {activePlayers.length} VOTED
        </p>
      )}

      {selectedVoteId && !revealed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
          <button className="btn-danger" onClick={handleSubmitVote} disabled={hasVoted}>
            {hasVoted ? 'VOTE CAST' : 'CONFIRM VOTE'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
