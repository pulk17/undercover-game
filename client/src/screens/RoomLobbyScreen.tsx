import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore, socket } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';
import { useLocalGameStore } from '../stores/localGameStore';
import type { GameConfig, Player } from '../../../shared/types';

const PLAYER_COLORS = ['#3ecfb0', '#e8c547', '#9b6fe8', '#e84b4b', '#60a5fa', '#f97316', '#34d399', '#f472b6'];

function playerColor(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export default function RoomLobbyScreen() {
  const navigate = useNavigate();
  const { room, players, isHost, leaveRoom, error, isConnected } = useRoomStore();
  const { user } = useAuthStore();
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  function flashFeedback(message: string) {
    setShareFeedback(message);
    window.setTimeout(() => setShareFeedback(null), 1600);
  }

  async function handleLocalPlay() {
    const { initLocalGame, startGame } = useLocalGameStore.getState();
    const localPlayers: Player[] = Array.from({ length: 4 }, (_, index) => ({
      id: `p${index + 1}`,
      userId: null,
      nickname: `Player ${index + 1}`,
      avatarUrl: null,
      role: null,
      word: null,
      isHost: index === 0,
      isActive: true,
      isConnected: true,
      joinOrder: index,
      strikes: 0,
    }));

    const config: GameConfig = {
      mode: 'classic',
      categories: ['general'],
      difficulty: 'medium',
      clueTimerSeconds: null,
      discussionTimerSeconds: null,
      tieResolution: 're_vote',
      postEliminationReveal: true,
      detectiveEnabled: false,
      silentRoundEnabled: false,
      maxPlayers: 4,
      customWordPair: null,
    };

    initLocalGame(localPlayers, config);
    await startGame();
    navigate('/game/pass');
  }

  async function handleCopyCode() {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(room.code);
      flashFeedback('Code copied');
    } catch {
      flashFeedback('Copy unavailable');
    }
  }

  async function handleInvite() {
    if (!room) return;

    const inviteText = `Join my Undercover room: ${room.code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Undercover', text: inviteText }).catch(() => undefined);
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteText);
      flashFeedback('Invite copied');
    } catch {
      flashFeedback('Share unavailable');
    }
  }

  async function handleLeave() {
    try {
      await leaveRoom();
      navigate('/lobby', { replace: true });
    } catch {
      // Ignore leave errors and rely on local reset
    }
  }

  function handleStartGame() {
    if (!room) return;
    socket.emit('game:start');
  }

  if (!room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          padding: '24px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380, margin: '0 auto', minHeight: 'calc(100vh - 154px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 28 }}>
          <div>
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 22 }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Social Deduction Party Game
              </p>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(30px, 8vw, 44px)', lineHeight: 0.95, fontWeight: 800, color: '#e3e2e8', margin: '0 0 12px', letterSpacing: '-0.035em' }}>
                UNDERCOVER
              </h1>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: 0, lineHeight: 1.7 }}>
                Create a room for remote play or hand one device around for a quick local round.
              </p>
            </motion.div>

            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                style={{
                  marginBottom: 16,
                  background: 'rgba(232,75,75,0.08)',
                  border: '1px solid rgba(232,75,75,0.18)',
                  borderRadius: 14,
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', margin: 0, letterSpacing: '0.08em' }}>
                  Reconnecting to the server. Online room actions will resume shortly.
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}
            >
              <button className="btn-primary" onClick={() => navigate('/create')} disabled={!isConnected}>
                Create Room
              </button>
              <button className="btn-secondary" onClick={() => navigate('/join')} disabled={!isConnected}>
                Join Room
              </button>
              <button
                type="button"
                onClick={() => navigate('/play/local')}
                style={{
                  height: 52,
                  borderRadius: 12,
                  border: '1px solid rgba(155,111,232,0.26)',
                  background: 'rgba(155,111,232,0.08)',
                  color: '#b89af8',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                PASS & PLAY (OFFLINE)
              </button>
            </motion.div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              style={{
                background: '#12141c',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '16px 18px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Online
                </p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#e3e2e8', margin: 0, lineHeight: 1.4 }}>
                  Share a code and play from separate devices.
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Local
                </p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#e3e2e8', margin: 0, lineHeight: 1.4 }}>
                  Pass one phone around and keep the round moving fast.
                </p>
              </div>
            </motion.div>

            <button
              type="button"
              onClick={() => navigate('/how-to-play')}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'transparent',
                color: '#8c8a85',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              How To Play
            </button>

            {user && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'none',
                  border: 'none',
                  color: '#8c8a85',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: 'rgba(232,197,71,0.14)',
                    border: '1px solid rgba(232,197,71,0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    color: '#e8c547',
                  }}
                >
                  {(user.nickname || user.displayName || 'P').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                  {user.nickname || user.displayName}
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const connectedPlayers = players.filter((player) => player.isConnected);
  const canStart = connectedPlayers.length >= 3;
  const config = room.config;

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e3e2e8', padding: '20px 20px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 4px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Room Code
          </p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {room.code}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            height: 40,
            padding: '0 14px',
            color: '#8c8a85',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Settings
        </button>
      </div>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 18px 16px', marginBottom: 16 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.16em', textAlign: 'center' }}>
          Share This Code
        </p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'clamp(36px, 10vw, 48px)', color: '#e8c547', margin: '0 0 10px', textAlign: 'center', letterSpacing: '0.12em', lineHeight: 1 }}>
          {room.code}
        </p>
        {shareFeedback && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3ecfb0', margin: '0 0 10px', textAlign: 'center', letterSpacing: '0.08em' }}>
            {shareFeedback}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleCopyCode} className="btn-secondary" style={{ height: 42 }}>
            Copy Code
          </button>
          <button type="button" onClick={() => void handleInvite()} className="btn-secondary" style={{ height: 42 }}>
            Invite
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Chip color="#e8c547" label={config.mode.replace(/_/g, ' ')} />
        <Chip color="#3ecfb0" label={config.categories.join(', ')} />
        <Chip color="#9b6fe8" label={config.difficulty} />
        <Chip color="#60a5fa" label={`Max ${config.maxPlayers}`} />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
            Players ({players.length}/{config.maxPlayers})
          </p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: 0, letterSpacing: '0.08em' }}>
            {canStart ? 'Ready to start' : `Need 3 connected players (${connectedPlayers.length}/3)`}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((player, index) => {
            const accent = playerColor(index);
            const isMe = player.userId === user?.uid || player.id === socket.id;
            return (
              <div
                key={player.id}
                style={{
                  background: '#12141c',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${accent}18`,
                    border: `1px solid ${accent}36`,
                    color: accent,
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {player.nickname.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#e3e2e8', margin: '0 0 4px' }}>
                    {player.nickname}
                    {player.isHost ? ' (Host)' : ''}
                    {isMe ? ' (You)' : ''}
                  </p>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: player.isConnected ? '#3ecfb0' : '#e8c547', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {player.isConnected ? 'Connected' : 'Reconnecting'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {error && (
        <div
          style={{
            marginBottom: 14,
            background: 'rgba(232,75,75,0.08)',
            border: '1px solid rgba(232,75,75,0.22)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e84b4b', margin: 0, lineHeight: 1.5 }}>
            {error}
          </p>
        </div>
      )}

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isHost ? (
          <>
            <button type="button" onClick={handleStartGame} disabled={!canStart || !isConnected} className="btn-primary" style={{ height: 56 }}>
              Start Game
            </button>
            <button
              type="button"
              onClick={() => navigate('/create?edit=1')}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(232,197,71,0.25)',
                background: 'transparent',
                color: '#e8c547',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              Party Settings
            </button>
          </>
        ) : (
          <div style={{ height: 54, borderRadius: 14, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', letterSpacing: '0.08em' }}>
              Waiting for the host to start
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLeave}
          style={{
            height: 42,
            border: 'none',
            background: 'transparent',
            color: '#e84b4b',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          Leave Room
        </button>
      </motion.section>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        background: `${color}12`,
        border: `1px solid ${color}28`,
        color,
        borderRadius: 999,
        padding: '6px 10px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
}
