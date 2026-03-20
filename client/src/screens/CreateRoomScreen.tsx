import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore } from '../stores/roomStore';
import type { GameConfig, GameMode, Difficulty, TieResolution } from '../../../shared/types';

const defaultConfig: GameConfig = {
  mode: 'classic',
  categories: ['general'],
  difficulty: 'medium',
  clueTimerSeconds: 60,
  discussionTimerSeconds: 120,
  tieResolution: 're_vote',
  postEliminationReveal: true,
  detectiveEnabled: false,
  silentRoundEnabled: false,
  maxPlayers: 8,
  customWordPair: null,
};

async function hashPassword(password: string): Promise<string | null> {
  if (!password) return null;
  if (!crypto.subtle) {
    console.warn('crypto.subtle not available. Passwords require a secure context (HTTPS/localhost). Proceeding without password hash for local dev.');
    return null;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MODES: { value: GameMode; label: string; icon: string }[] = [
  { value: 'classic', label: 'CLASSIC', icon: '◎' },
  { value: 'speed_round', label: 'SPEED', icon: '⚡' },
  { value: 'double_agent', label: 'DOUBLE', icon: '◈' },
  { value: 'reverse_mode', label: 'REVERSE', icon: '↺' },
];

const CATEGORIES = ['general', 'food', 'travel', 'cinema', 'sports', 'tech'];

const DIFFICULTIES: { value: Difficulty; color: string }[] = [
  { value: 'easy', color: '#3ecfb0' },
  { value: 'medium', color: '#e8c547' },
  { value: 'hard', color: '#e84b4b' },
];

const TIMER_OPTIONS = [30, 60, 90];

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10,
      letterSpacing: '0.2em',
      color: '#4a5068',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </p>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={checked ? 'toggle-on' : 'toggle-off'}
      onClick={() => onChange(!checked)}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

export default function CreateRoomScreen() {
  const navigate = useNavigate();
  const { createRoom, error } = useRoomStore();

  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const [password, setPassword] = useState('');
  const [clueUnlimited, setClueUnlimited] = useState(false);
  const [discussionUnlimited, setDiscussionUnlimited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof GameConfig>(key: K, value: GameConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalConfig: GameConfig = {
        ...config,
        clueTimerSeconds: clueUnlimited ? null : config.clueTimerSeconds,
        discussionTimerSeconds: discussionUnlimited ? null : config.discussionTimerSeconds,
      };
      // hashPassword now gracefully returns null if crypto.subtle is unsupported (e.g. local IP testing over HTTP)
      const passwordHash = password ? await hashPassword(password) : null;
      await createRoom(finalConfig, passwordHash);
      navigate('/lobby');
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      color: '#e3e2e8',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '24px 20px 0',
        marginBottom: 8,
      }}>
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', margin: '0 0 4px' }}>
            SEC-R812-B
          </p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.01em' }}>
            NEW ROOM
          </h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#8c8a85', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Game Mode */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionLabel>GAME MODE</SectionLabel>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547', letterSpacing: '0.1em' }}>SELECT_ONE</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {MODES.map((m) => {
              const active = config.mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setField('mode', m.value)}
                  style={{
                    minWidth: 80,
                    height: 72,
                    background: active ? 'rgba(232,197,71,0.08)' : '#12141c',
                    border: `1px solid ${active ? '#e8c547' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 18, color: active ? '#e8c547' : '#8c8a85' }}>{m.icon}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: active ? '#e8c547' : '#8c8a85' }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Word Category */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionLabel>WORD CATEGORY</SectionLabel>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => {
              const active = config.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    const isLast = config.categories.length === 1;
                    if (active && isLast) return; // prevent zero categories
                    const next = active 
                      ? config.categories.filter((c) => c !== cat)
                      : [...config.categories, cat];
                    setField('categories', next);
                  }}
                  style={{
                    minWidth: 80,
                    height: 72,
                    background: active ? 'rgba(62,207,176,0.08)' : '#12141c',
                    border: `1px solid ${active ? '#3ecfb0' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: active ? '#3ecfb0' : '#8c8a85', textTransform: 'uppercase' }}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Difficulty */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionLabel>DIFFICULTY_THREAT_LEVEL</SectionLabel>
          <div style={{
            display: 'flex',
            background: '#12141c',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}>
            {DIFFICULTIES.map((d) => {
              const active = config.difficulty === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setField('difficulty', d.value)}
                  style={{
                    flex: 1,
                    height: 40,
                    background: active ? d.color : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: active ? '#000' : '#8c8a85',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 150ms ease',
                  }}
                >
                  {d.value}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Directives (options rows) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionLabel>DIRECTIVES</SectionLabel>
          <div style={{
            background: '#12141c',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            {/* Clue Timer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>Time Limit per Turn</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {clueUnlimited ? (
                  <button type="button" onClick={() => setClueUnlimited(false)} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3ecfb0', background: 'rgba(62,207,176,0.1)', border: '1px solid rgba(62,207,176,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>∞</button>
                ) : (
                  TIMER_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setField('clueTimerSeconds', t)}
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 10,
                        color: config.clueTimerSeconds === t ? '#000' : '#8c8a85',
                        background: config.clueTimerSeconds === t ? '#3ecfb0' : 'transparent',
                        border: `1px solid ${config.clueTimerSeconds === t ? '#3ecfb0' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {t}s
                    </button>
                  ))
                )}
                <button type="button" onClick={() => setClueUnlimited(v => !v)} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 4px' }}>
                  {clueUnlimited ? '⏱' : '∞'}
                </button>
              </div>
            </div>

            {/* Post-elimination reveal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>Reveal Role After Elim</span>
              <Toggle checked={config.postEliminationReveal} onChange={(v) => setField('postEliminationReveal', v)} />
            </div>

            {/* Detective */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>Detective Mode</span>
              <Toggle checked={config.detectiveEnabled} onChange={(v) => setField('detectiveEnabled', v)} />
            </div>

            {/* Silent round */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>Silent Round</span>
              <Toggle checked={config.silentRoundEnabled} onChange={(v) => setField('silentRoundEnabled', v)} />
            </div>
          </div>
        </motion.div>

        {/* Capacity + Password */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: '#4a5068', textTransform: 'uppercase', margin: '0 0 6px' }}>CAPACITY</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e3e2e8', margin: '0 0 2px' }}>
              3 – {config.maxPlayers}
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8c8a85', margin: 0 }}>PLAYERS</p>
          </div>
          <div style={{ flex: 1, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: '#4a5068', textTransform: 'uppercase', margin: '0 0 6px' }}>MAX PLAYERS</p>
            <input
              type="number"
              min={3}
              max={12}
              value={config.maxPlayers}
              onChange={(e) => setField('maxPlayers', Math.min(12, Math.max(3, Number(e.target.value))))}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: 22,
                color: '#e8c547',
                width: '100%',
                outline: 'none',
                padding: 0,
              }}
            />
          </div>
        </motion.div>

        {/* Optional password */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionLabel>ROOM PASSWORD (OPTIONAL)</SectionLabel>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for open room"
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
        </motion.div>

        {error && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e84b4b' }}>{error}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 56, fontSize: 15 }}>
          {submitting ? 'CREATING…' : 'START LOBBY →'}
        </button>
      </form>
    </div>
  );
}
