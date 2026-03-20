import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore, socket } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';
import { useLocalGameStore } from '../stores/localGameStore';
import type { GameConfig, Player } from '../../../shared/types';

// Deterministic accent color per player
const PLAYER_COLORS = ['#3ecfb0', '#e8c547', '#9b6fe8', '#e84b4b', '#60a5fa', '#f97316', '#34d399', '#f472b6'];
function playerColor(idx: number) { return PLAYER_COLORS[idx % PLAYER_COLORS.length]; }

export default function RoomLobbyScreen() {
  const navigate = useNavigate();
  const { room, players, isHost, qrDataUrl, leaveRoom } = useRoomStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  async function handleLocalPlay() {
    const { initLocalGame, startGame } = useLocalGameStore.getState();
    const localPlayers: Player[] = [
      { id: 'p1', userId: null, nickname: 'Player 1', avatarUrl: null, role: null, word: null, isHost: true, isActive: true, isConnected: true, joinOrder: 0, strikes: 0 },
      { id: 'p2', userId: null, nickname: 'Player 2', avatarUrl: null, role: null, word: null, isHost: false, isActive: true, isConnected: true, joinOrder: 1, strikes: 0 },
      { id: 'p3', userId: null, nickname: 'Player 3', avatarUrl: null, role: null, word: null, isHost: false, isActive: true, isConnected: true, joinOrder: 2, strikes: 0 },
      { id: 'p4', userId: null, nickname: 'Player 4', avatarUrl: null, role: null, word: null, isHost: false, isActive: true, isConnected: true, joinOrder: 3, strikes: 0 },
    ];
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

  // When there's no room, show the home/landing view instead of redirecting
  if (!room) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 32,
      }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(36px, 9vw, 52px)',
            color: '#e3e2e8',
            margin: '0 0 8px',
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
          }}>
            UNDERCOVER
          </h1>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: '#4a5068',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            WHO IS THE SPY?
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}
        >
          <button className="btn-primary" onClick={() => navigate('/create')}>
            CREATE ROOM
          </button>
          <button className="btn-secondary" onClick={() => navigate('/join')}>
            JOIN ROOM
          </button>
          <button
            onClick={handleLocalPlay}
            style={{
              height: 52,
              background: 'rgba(155,111,232,0.1)',
              border: '1px solid rgba(155,111,232,0.3)',
              borderRadius: 12,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#9b6fe8',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              transition: 'all 150ms ease',
            }}
          >
            LOCAL PLAY — PASS & PLAY
          </button>
        </motion.div>

        {/* User info footer */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/profile')}
            style={{
              position: 'absolute',
              bottom: 100,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(232,197,71,0.15)',
              border: '1px solid rgba(232,197,71,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              color: '#e8c547',
            }}>
              {(user.nickname || user.displayName || 'PK').slice(0, 2).toUpperCase()}
            </div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: 0 }}>
              {user.nickname || user.displayName}
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  const canStart = players.length >= 3;

  async function handleLeave() {
    await leaveRoom();
    navigate('/lobby');
  }

  function handleStart() {
    socket.emit('game:start', { code: room!.code });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(room!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cfg = room.config;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      color: '#e3e2e8',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e8c547', letterSpacing: '0.15em', margin: '0 0 2px', textTransform: 'uppercase' }}>
            ROOM: {room.code}
          </p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>
            OPERATION: SILENT WOLF
          </p>
        </div>
        <button
          onClick={() => {/* notification placeholder */}}
          style={{ background: 'none', border: 'none', color: '#4a5068', fontSize: 18, cursor: 'pointer', padding: 4 }}
          aria-label="Notifications"
        >
          🔔
        </button>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Room code card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            background: '#12141c',
            border: '1px dashed rgba(232,197,71,0.4)',
            borderRadius: 14,
            padding: '20px 20px 16px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#4a5068', textTransform: 'uppercase', margin: '0 0 8px', textAlign: 'center' }}>
            IDENTIFICATION CODE
          </p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, fontSize: 48, color: '#e8c547', letterSpacing: '0.1em', margin: '0 0 8px', textAlign: 'center', lineHeight: 1 }}>
            {room.code}
          </p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', textAlign: 'center', margin: '0 0 16px' }}>
            Distribute credentials to allied operatives
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {qrDataUrl && (
              <button
                onClick={() => {/* show QR */}}
                style={{
                  flex: 1,
                  height: 40,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  color: '#e3e2e8',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                ▦ SHOW QR
              </button>
            )}
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                height: 40,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: copied ? '#3ecfb0' : '#e3e2e8',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'color 150ms ease',
              }}
            >
              ⎘ {copied ? 'COPIED!' : 'COPY LINK'}
            </button>
          </div>
        </motion.div>

        {/* Config chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          <ConfigChip label={cfg.mode.replace(/_/g, ' ').toUpperCase()} color="#e8c547" />
          <ConfigChip label={cfg.categories.join(', ').toUpperCase()} color="#3ecfb0" />
          <ConfigChip label={`DIFFICULTY: ${cfg.difficulty.toUpperCase()}`} color="#9b6fe8" />
        </motion.div>

        {/* Player list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#e3e2e8', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              VERIFIED OPERATIVES ({players.length}/{cfg.maxPlayers})
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: 0, letterSpacing: '0.1em' }}>
              RN: 042-ALPHA
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player, idx) => {
              const color = playerColor(idx);
              const initials = player.nickname.slice(0, 2).toUpperCase();
              const isMe = player.userId === user?.uid;
              const ready = player.isConnected;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  style={{
                    background: '#12141c',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    height: 68,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: 14,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: 13,
                    color,
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>

                  {/* Name + ID */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, fontSize: 13, color: '#e3e2e8', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {player.nickname.toUpperCase()}
                      {player.isHost && <span style={{ color: '#e8c547', fontSize: 12 }}>♛</span>}
                      {isMe && <span style={{ color: '#4a5068', fontSize: 10 }}>(you)</span>}
                    </p>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '2px 0 0', letterSpacing: '0.08em' }}>
                      ID: {String(idx + 1).padStart(3, '0')}-{['ALPHA', 'KAPPA', 'SIGMA', 'DELTA', 'OMEGA', 'ZETA', 'BETA', 'GAMMA'][idx % 8]}
                    </p>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      className="pulse-dot"
                      style={{ background: ready ? '#3ecfb0' : '#e8c547' }}
                    />
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: ready ? '#3ecfb0' : '#e8c547',
                    }}>
                      {ready ? 'READY' : 'WAITING...'}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, cfg.maxPlayers - players.length) }).slice(0, 3).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  height: 68,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4a5068',
                  fontSize: 20,
                }}
              >
                +
              </div>
            ))}
          </div>
        </motion.div>

        {/* Start / Leave */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="btn-primary"
              style={{ height: 56, fontSize: 15 }}
            >
              START MISSION
            </button>
          ) : (
            <div style={{
              height: 56,
              background: '#12141c',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              <div className="pulse-dot" style={{ background: '#e8c547' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85', letterSpacing: '0.1em' }}>
                AWAITING HOST COMMAND
              </span>
            </div>
          )}

          <button
            onClick={() => {/* invite */}}
            style={{
              height: 44,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#8c8a85',
              cursor: 'pointer',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            ⊕ INVITE FRIENDS
          </button>

          <button
            onClick={handleLeave}
            style={{
              height: 44,
              background: 'transparent',
              border: 'none',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#e84b4b',
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            LEAVE ROOM
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function ConfigChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: `${color}11`,
      border: `1px solid ${color}33`,
      borderRadius: 8,
      padding: '5px 10px',
      borderLeft: `3px solid ${color}`,
    }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color, letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}
