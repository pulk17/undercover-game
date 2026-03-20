import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { socket, useRoomStore } from '../stores/roomStore';

const RECONNECT_WINDOW_S = 60;
const MAX_BACKOFF_MS = 30_000;

export function ReconnectingOverlay() {
  const { isConnected, room } = useRoomStore();

  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(RECONNECT_WINDOW_S);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myPlayerIdRef = useRef('');
  const reconnectPlayerIdRef = useRef('');
  const reconnectRequestedRef = useRef(false);
  const wasInRoomRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (backoffRef.current) {
      clearTimeout(backoffRef.current);
      backoffRef.current = null;
    }
  }, []);

  const completeReconnect = useCallback(() => {
    if (socket.id) {
      myPlayerIdRef.current = socket.id;
    }
    reconnectPlayerIdRef.current = '';
    reconnectRequestedRef.current = false;
    setVisible(false);
    clearTimers();
  }, [clearTimers]);

  const startCountdown = useCallback(() => {
    clearTimers();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          reconnectRequestedRef.current = false;
          setFailed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers]);

  useEffect(() => {
    function onConnect() {
      if (!visible && socket.id) {
        myPlayerIdRef.current = socket.id;
      }
    }

    function onStateSync() {
      if (!visible) return;
      completeReconnect();
    }

    function onRoomError({ message }: { message: string }) {
      if (!visible) return;

      const normalizedMessage = message.toLowerCase();
      if (
        normalizedMessage.includes('reconnect') ||
        normalizedMessage.includes('rejoin') ||
        normalizedMessage.includes('player not found')
      ) {
        reconnectRequestedRef.current = false;
        setFailed(true);
        clearTimers();
      }
    }

    socket.on('connect', onConnect);
    socket.on('game:state_sync', onStateSync);
    socket.on('room:error', onRoomError);

    if (socket.id) {
      myPlayerIdRef.current = socket.id;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('game:state_sync', onStateSync);
      socket.off('room:error', onRoomError);
    };
  }, [clearTimers, completeReconnect, visible]);

  useEffect(() => {
    wasInRoomRef.current = Boolean(room);
  }, [room]);

  useEffect(() => {
    if (!isConnected && wasInRoomRef.current) {
      reconnectPlayerIdRef.current = myPlayerIdRef.current || socket.id || '';
      reconnectRequestedRef.current = false;
      setVisible(true);
      setCountdown(RECONNECT_WINDOW_S);
      setFailed(false);
      setAttempt(0);
      startCountdown();
      return;
    }

    if (isConnected && !reconnectRequestedRef.current) {
      setVisible(false);
      clearTimers();
    }
  }, [clearTimers, isConnected, startCountdown]);

  useEffect(() => {
    if (!visible || failed || isConnected) return;

    const delayMs = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
    backoffRef.current = setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
        setAttempt((value) => value + 1);
      }
    }, delayMs);

    return () => {
      if (backoffRef.current) {
        clearTimeout(backoffRef.current);
        backoffRef.current = null;
      }
    };
  }, [attempt, failed, isConnected, visible]);

  useEffect(() => {
    if (!isConnected || !room || !visible || failed || reconnectRequestedRef.current) return;

    const playerId = reconnectPlayerIdRef.current;
    if (!playerId) {
      setFailed(true);
      clearTimers();
      return;
    }

    reconnectRequestedRef.current = true;
    socket.emit('game:reconnect', { roomCode: room.code, playerId });
  }, [clearTimers, failed, isConnected, room, visible]);

  useEffect(() => () => clearTimers(), [clearTimers]);

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
          zIndex: 9999,
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
            <div
              style={{
                marginBottom: 12,
                borderRadius: 999,
                border: '1px solid rgba(232,75,75,0.35)',
                background: 'rgba(232,75,75,0.08)',
                color: '#e84b4b',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.14em',
                padding: '6px 12px',
              }}
            >
              OFFLINE
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e84b4b', marginBottom: 8 }}>
              Connection lost
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#8c8a85', marginBottom: 24 }}>
              The reconnect window expired. Please rejoin the room.
            </p>
            <button
              onClick={() => {
                reconnectRequestedRef.current = false;
                setVisible(false);
                clearTimers();
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
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e3e2e8', marginBottom: 4 }}>
              Reconnecting...
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#8c8a85', marginBottom: 16 }}>
              Attempt {attempt + 1}. Your spot is held for <span style={{ color: '#e8c547' }}>{countdown}s</span>
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068' }}>
              Do not close this tab. We will restore your seat automatically.
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
