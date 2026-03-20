import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore, socket } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import type { PublicGameState } from '../../../shared/types';

const RECONNECT_WINDOW_S = 60; // must match server RECONNECT_TTL
const MAX_BACKOFF_MS = 30_000;

/**
 * Full-screen overlay shown when the socket disconnects during a game.
 * Attempts to reconnect with exponential backoff and emits `game:reconnect`
 * once the socket is back online.
 */
export function ReconnectingOverlay() {
  const { isConnected, room, players } = useRoomStore();
  const { setGameState } = useGameStore();

  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(RECONNECT_WINDOW_S);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myPlayerIdRef = useRef<string>(socket.id ?? '');

  // Show overlay when disconnected while in a room
  useEffect(() => {
    if (!isConnected && room) {
      setVisible(true);
      setCountdown(RECONNECT_WINDOW_S);
      setFailed(false);
      startCountdown();
    } else if (isConnected) {
      setVisible(false);
      clearTimers();
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, room]);

  function clearTimers() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (backoffRef.current) clearTimeout(backoffRef.current);
  }

  function startCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setFailed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Exponential backoff reconnect attempts
  useEffect(() => {
    if (!visible || failed) return;

    const delayMs = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
    backoffRef.current = setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
        setAttempt((a) => a + 1);
      }
    }, delayMs);

    return () => {
      if (backoffRef.current) clearTimeout(backoffRef.current);
    };
  }, [visible, attempt, failed]);

  // Once socket reconnects, emit game:reconnect to restore state
  useEffect(() => {
    if (!isConnected || !room) return;

    const playerId = myPlayerIdRef.current;
    socket.emit('game:reconnect', { roomCode: room.code, playerId });

    // Listen for state sync response
    socket.once('game:state_sync', ({ state, players: updatedPlayers }: {
      state: PublicGameState | null;
      players: typeof players;
    }) => {
      if (state) setGameState(state);
      useRoomStore.setState({ players: updatedPlayers });
    });
  }, [isConnected, room]);

  // Track our own socket ID before disconnect
  useEffect(() => {
    if (socket.id) myPlayerIdRef.current = socket.id;
  }, [isConnected]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="reconnect-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          textAlign: 'center',
          background: 'rgba(8,9,13,0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {failed ? (
          <>
            <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e84b4b', marginBottom: 8 }}>Connection lost</h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#8c8a85', marginBottom: 24 }}>
              The reconnect window expired. Please rejoin the room.
            </p>
            <button
              onClick={() => {
                setVisible(false);
                useRoomStore.getState().reset();
                useGameStore.getState().reset();
              }}
              style={{
                background: '#e8c547',
                color: '#000',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back to lobby
            </button>
          </>
        ) : (
          <>
            {/* Spinner */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: '#e8c547',
                marginBottom: 24,
              }}
            />
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e3e2e8', marginBottom: 4 }}>Reconnecting…</h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#8c8a85', marginBottom: 16 }}>
              Attempt {attempt + 1} — your spot is held for{' '}
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#e8c547' }}>{countdown}s</span>
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068' }}>
              Don't close this tab — we'll get you back in automatically.
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
