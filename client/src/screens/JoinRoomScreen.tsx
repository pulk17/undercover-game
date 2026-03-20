import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore } from '../stores/roomStore';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CELL_COUNT = 6;

export default function JoinRoomScreen() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { joinRoom, error } = useRoomStore();

  const [cells, setCells] = useState<string[]>(() => {
    const pre = (urlCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CELL_COUNT).split('');
    return [...pre, ...Array(CELL_COUNT - pre.length).fill('')];
  });
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = cells.join('');
  const allFilled = code.length === CELL_COUNT;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleCellChange(idx: number, val: string) {
    const char = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...cells];
    next[idx] = char;
    setCells(next);
    if (char && idx < CELL_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !cells[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CELL_COUNT);
    const next = [...cells];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setCells(next);
    const focusIdx = Math.min(pasted.length, CELL_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled || submitting) return;
    setSubmitting(true);
    try {
      const passwordHash = password ? await hashPassword(password) : null;
      await joinRoom(code, passwordHash);
      navigate('/lobby');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      paddingBottom: 80,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 360 }}
      >
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#8c8a85', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer', marginBottom: 32, padding: 0, letterSpacing: '0.1em' }}
        >
          ← BACK
        </button>

        <p className="label-mono" style={{ marginBottom: 8 }}>ENTER CODE</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e3e2e8', margin: '0 0 32px' }}>
          Join Room
        </h1>

        <form onSubmit={handleSubmit}>
          {/* 6-cell code input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }} onPaste={handlePaste}>
            {cells.map((cell, idx) => {
              const isFocused = false; // managed by browser
              return (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={cell}
                  onChange={(e) => handleCellChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8c547';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(232,197,71,0.2), inset 0 1px 0 rgba(255,255,255,0.06)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = cell ? 'rgba(232,197,71,0.5)' : 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
                  }}
                />
              );
            })}
          </div>

          {/* Optional password */}
          <div style={{ marginBottom: 24 }}>
            <p className="label-mono" style={{ marginBottom: 8 }}>PASSWORD (OPTIONAL)</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              onFocus={(e) => { e.currentTarget.style.borderColor = '#e8c547'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e84b4b', marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!allFilled || submitting}
            className="btn-primary"
          >
            {submitting ? 'JOINING…' : 'ENTER CODE →'}
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
