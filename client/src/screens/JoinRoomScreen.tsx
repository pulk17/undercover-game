import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../stores/roomStore';

const CELL_COUNT = 6;

async function hashPassword(password: string): Promise<string | null> {
  if (!password) return null;
  if (!crypto?.subtle) {
    throw new Error('Secure password hashing is unavailable in this browser.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
}

export default function JoinRoomScreen() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { joinRoom, error, isConnected } = useRoomStore();

  const [cells, setCells] = useState<string[]>(() => {
    const prefilled = (urlCode ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CELL_COUNT)
      .split('');
    return [...prefilled, ...Array(CELL_COUNT - prefilled.length).fill('')];
  });
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = cells.join('');
  const allFilled = cells.every((cell) => cell.length === 1);

  useEffect(() => {
    const firstEmptyIndex = cells.findIndex((cell) => cell === '');
    const focusIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : CELL_COUNT - 1;
    inputRefs.current[focusIndex]?.focus();
  }, [cells]);

  function handleCellChange(index: number, value: string) {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...cells];
    next[index] = char;
    setCells(next);

    if (char && index < CELL_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !cells[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CELL_COUNT);

    const next = Array.from({ length: CELL_COUNT }, () => '');
    pasted.split('').forEach((char, index) => {
      next[index] = char;
    });
    setCells(next);

    const focusIndex = Math.min(pasted.length, CELL_COUNT - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!allFilled || submitting || !isConnected) return;

    setSubmitting(true);
    try {
      const passwordHash = await hashPassword(password);
      await joinRoom(code, passwordHash);
      navigate('/lobby');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 360 }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#8c8a85',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            cursor: 'pointer',
            marginBottom: 32,
            padding: 0,
            letterSpacing: '0.1em',
          }}
        >
          BACK
        </button>

        <p className="label-mono" style={{ marginBottom: 8 }}>
          Enter Code
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e3e2e8', margin: '0 0 12px' }}>
          Join Room
        </h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: '0 0 28px', lineHeight: 1.6 }}>
          Type the six-character room code exactly as it appears on the host device.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }} onPaste={handlePaste}>
            {cells.map((cell, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={cell}
                onChange={(event) => handleCellChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                aria-label={`Room code character ${index + 1}`}
                style={{
                  width: 44,
                  height: 56,
                  flexShrink: 0,
                  background: '#12141c',
                  border: `1px solid ${cell ? 'rgba(232,197,71,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12,
                  textAlign: 'center',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 22,
                  fontWeight: 600,
                  color: '#e3e2e8',
                  outline: 'none',
                  textTransform: 'uppercase',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = '#e8c547';
                  event.currentTarget.style.boxShadow = '0 0 0 2px rgba(232,197,71,0.2), inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = cell ? 'rgba(232,197,71,0.5)' : 'rgba(255,255,255,0.07)';
                  event.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
              />
            ))}
          </div>

          {!isConnected && (
            <div
              style={{
                marginBottom: 16,
                background: 'rgba(232,75,75,0.08)',
                border: '1px solid rgba(232,75,75,0.18)',
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', margin: 0, lineHeight: 1.5 }}>
                Waiting for the server connection before joining.
              </p>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <p className="label-mono" style={{ marginBottom: 8 }}>
              Password (Optional)
            </p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank if none"
              style={{
                width: '100%',
                height: 48,
                background: '#12141c',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '0 16px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 13,
                color: '#e3e2e8',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = '#e8c547';
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e84b4b', marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={!allFilled || submitting || !isConnected} className="btn-primary">
            {submitting ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068' }}>
          No room?{' '}
          <button
            type="button"
            onClick={() => navigate('/create')}
            style={{ background: 'none', border: 'none', color: '#e8c547', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Create one
          </button>
        </p>
      </motion.div>
    </div>
  );
}
