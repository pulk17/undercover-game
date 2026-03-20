import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { socket, useRoomStore } from '../stores/roomStore';
import { useLocalGameStore } from '../stores/localGameStore';
import type { PublicGameState, WinFaction } from '../../../shared/types';
import { generateResultCard } from '../utils/generateResultCard';

interface FactionConfig {
  label: string;
  color: string;
  bgPulse: string;
}

type DisplayOutcome = WinFaction | 'ended';

function getFactionConfig(faction: DisplayOutcome): FactionConfig {
  switch (faction) {
    case 'civilian':
      return { label: 'CIVILIANS WIN', color: '#3ecfb0', bgPulse: 'rgba(62,207,176,0.06)' };
    case 'undercover':
      return { label: 'UNDERCOVER WINS', color: '#e84b4b', bgPulse: 'rgba(232,75,75,0.06)' };
    case 'mr_white':
      return { label: 'MR. WHITE WINS', color: '#9b6fe8', bgPulse: 'rgba(155,111,232,0.06)' };
    case 'ended':
      return { label: 'GAME ENDED', color: '#8c8a85', bgPulse: 'rgba(255,255,255,0.04)' };
  }
}

function didLocalPlayerWin(myRole: string | null, winner: WinFaction): boolean {
  if (!myRole) return false;
  if (winner === 'civilian') return myRole === 'civilian' || myRole === 'detective';
  if (winner === 'undercover') return myRole === 'undercover';
  if (winner === 'mr_white') return myRole === 'mr_white';
  return false;
}

const PRESET_TITLES = [
  'The Mastermind',
  'The Bluffer',
  'The Detective',
  'The Quiet One',
  'The Loudmouth',
  'The Lucky One',
];

function TitleVoting({ mySocketId }: { mySocketId: string }) {
  const players = useRoomStore((state) => state.players);
  const [voted, setVoted] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [open, setOpen] = useState(false);
  const otherPlayers = players.filter((player) => player.id !== mySocketId);

  useEffect(() => {
    function onResults(data: Record<string, string>) {
      setResults(data);
    }

    socket.on('title:results', onResults);
    return () => {
      socket.off('title:results', onResults);
    };
  }, []);

  function castVote(targetPlayerId: string, title: string) {
    if (voted[targetPlayerId]) return;
    socket.emit('title:vote', { targetPlayerId, title });
    setVoted((prev) => ({ ...prev, [targetPlayerId]: title }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      style={{ width: '100%', maxWidth: 320 }}
    >
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#12141c',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8c8a85',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          Title Voting
        </span>
        <span style={{ color: '#4a5068', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            background: '#12141c',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {results ? (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherPlayers.map((player) => (
                <div
                  key={player.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                >
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e3e2e8', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {player.nickname}
                  </span>
                  <span
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      color: '#e8c547',
                      background: 'rgba(232,197,71,0.1)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      textAlign: 'right',
                    }}
                  >
                    {results[player.id] ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {otherPlayers.map((player) => (
                <div key={player.id}>
                  <p
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 12,
                      color: '#e3e2e8',
                      margin: '0 0 8px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {player.nickname}
                  </p>
                  {voted[player.id] ? (
                    <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 10,
                        color: '#3ecfb0',
                        background: 'rgba(62,207,176,0.1)',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {voted[player.id]}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PRESET_TITLES.map((title) => (
                        <button
                          key={title}
                          onClick={() => castVote(player.id, title)}
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: 10,
                            color: '#8c8a85',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            transition: 'all 100ms ease',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function GameOverScreen() {
  const navigate = useNavigate();
  const { gameState, myRole } = useGameStore();
  const { isHost, room, players } = useRoomStore();
  const mySocketId = socket.id ?? '';
  const isLocalMode = useLocalGameStore((state) => state.isLocalMode);
  const localWinner = useLocalGameStore((state) => state.gameState?.winner ?? null);
  const resetLocalGame = useLocalGameStore((state) => state.reset);

  const [winner, setWinner] = useState<WinFaction | null>(gameState?.winner ?? localWinner ?? null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [tournamentScores, setTournamentScores] = useState<Record<string, number> | null>(
    gameState?.tournamentScores ?? null,
  );

  useEffect(() => {
    function onWinner({
      winner: nextWinner,
      state,
    }: {
      winner: WinFaction | null;
      state: PublicGameState;
    }) {
      setWinner(nextWinner);
      if (state?.tournamentScores) setTournamentScores(state.tournamentScores);
    }

    socket.on('game:winner', onWinner);
    return () => {
      socket.off('game:winner', onWinner);
    };
  }, []);

  useEffect(() => {
    if (gameState?.winner) setWinner(gameState.winner);
    if (!gameState?.winner && localWinner) setWinner(localWinner);
    if (gameState?.tournamentScores) setTournamentScores(gameState.tournamentScores);
  }, [gameState?.winner, gameState?.tournamentScores, localWinner]);

  async function handleShare() {
    if (!winner) return;

    const cfg = getFactionConfig(winner);
    const playerWon = !isLocalMode && didLocalPlayerWin(myRole, winner);
    const text = `I just played Undercover! ${cfg.label}!`;
    const round = gameState?.round ?? 1;

    try {
      const blob = await generateResultCard({ winner, playerWon, nickname: '', round });
      const file = new File([blob], 'undercover-result.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch {
      // fall through
    }

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // cancelled
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // unavailable
    }
  }

  function getPlayerLabel(playerId: string) {
    return players.find((player) => player.id === playerId)?.nickname ?? playerId;
  }

  const outcome: DisplayOutcome | null =
    winner ?? (gameState?.phase === 'game_over' && gameState?.winner === null ? 'ended' : null);

  if (!outcome) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08090d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: '#4a5068',
            letterSpacing: '0.1em',
          }}
        >
          Loading Result...
        </p>
      </div>
    );
  }

  const cfg = getFactionConfig(outcome);
  const playerWon = !isLocalMode && outcome !== 'ended' && didLocalPlayerWin(myRole, outcome);
  const resultLabel = isLocalMode ? 'PASS AND PLAY COMPLETE' : playerWon ? 'YOU WON' : outcome === 'ended' ? 'NO WINNER' : 'YOU LOST';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at 50% 0%, ${cfg.bgPulse} 0%, #08090d 60%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        gap: 24,
        overflowX: 'hidden',
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(28px, 8vw, 36px)',
          color: cfg.color,
          margin: 0,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          overflowWrap: 'anywhere',
          maxWidth: 320,
        }}
      >
        {cfg.label}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 160, damping: 18 }}
        style={{
          background: playerWon ? `${cfg.color}15` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${playerWon ? `${cfg.color}44` : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 12,
          padding: '10px 24px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          color: playerWon ? cfg.color : '#8c8a85',
          letterSpacing: '0.1em',
        }}
      >
        {resultLabel}
      </motion.div>

      {!isLocalMode && <TitleVoting mySocketId={mySocketId} />}

      {tournamentScores && (
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            background: '#12141c',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {Object.entries(tournamentScores).map(([playerId, score]) => (
            <div key={playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', overflowWrap: 'anywhere' }}>
                {getPlayerLabel(playerId)}
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e8c547' }}>
                {score}
              </span>
            </div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}
      >
        <button
          onClick={handleShare}
          disabled={outcome === 'ended'}
          style={{
            height: 48,
            background: `${cfg.color}15`,
            border: `1px solid ${cfg.color}44`,
            borderRadius: 12,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: cfg.color,
            cursor: outcome === 'ended' ? 'not-allowed' : 'pointer',
            letterSpacing: '0.1em',
            transition: 'all 150ms ease',
            opacity: outcome === 'ended' ? 0.45 : 1,
          }}
        >
          {shareStatus === 'copied' ? 'COPIED' : 'SHARE RESULT'}
        </button>

        {!isLocalMode && room && (
          <button
            onClick={() => socket.emit('host:reset_to_lobby')}
            className="btn-secondary"
            disabled={!isHost}
          >
            {isHost ? 'PLAY AGAIN WITH ROOM' : 'WAITING FOR HOST REMATCH'}
          </button>
        )}

        <button
          onClick={() => {
            if (isLocalMode) {
              resetLocalGame();
            }
            navigate('/lobby');
          }}
          className="btn-primary"
        >
          BACK TO LOBBY
        </button>
      </motion.div>
    </div>
  );
}
