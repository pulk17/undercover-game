import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { env } from '../env';
import type { Level } from '../../../shared/types';

interface LevelTier { label: string; min: number; max: number; color: string; }
const LEVEL_TIERS: LevelTier[] = [
  { label: 'Rookie',      min: 0,    max: 500,  color: '#8c8a85' },
  { label: 'Agent',       min: 500,  max: 1500, color: '#60a5fa' },
  { label: 'Operative',   min: 1500, max: 3000, color: '#3ecfb0' },
  { label: 'Infiltrator', min: 3000, max: 5000, color: '#e8c547' },
  { label: 'Mastermind',  min: 5000, max: 8000, color: '#f97316' },
  { label: 'Phantom',     min: 8000, max: Infinity, color: '#e8c547' },
];
const LEVEL_TO_TIER: Record<Level, LevelTier> = {
  rookie: LEVEL_TIERS[0], agent: LEVEL_TIERS[1], operative: LEVEL_TIERS[2],
  infiltrator: LEVEL_TIERS[3], mastermind: LEVEL_TIERS[4], phantom: LEVEL_TIERS[5],
};

function getXpProgress(xp: number, level: Level) {
  const tier = LEVEL_TO_TIER[level];
  const current = xp - tier.min;
  const total = tier.max === Infinity ? 1000 : tier.max - tier.min;
  const pct = tier.max === Infinity ? Math.min(current / 1000, 1) : Math.min(current / total, 1);
  return { current, total: tier.max === Infinity ? tier.min + 1000 : tier.max, pct };
}

const ACHIEVEMENTS = [
  { id: 'first_spy', name: 'First Spy' }, { id: 'ghost', name: 'Ghost' },
  { id: 'sharpshooter', name: 'Sharpshooter' }, { id: 'mind_reader', name: 'Mind Reader' },
  { id: 'last_standing', name: 'Last Standing' }, { id: 'silver_tongue', name: 'Silver Tongue' },
  { id: 'seven_day_streak', name: '7-Day Streak' }, { id: 'globetrotter', name: 'Globetrotter' },
  { id: 'champion', name: 'Champion' }, { id: 'social_butterfly', name: 'Social Butterfly' },
];

interface UserStats {
  gamesPlayed?: number;
  wins?: { civilian?: number; undercover?: number; mr_white?: number };
  correctVotes?: number;
}

interface CustomWordPair {
  id: string;
  wordA: string;
  wordB: string;
  category: string;
  difficulty: string;
}

const BASE = env.VITE_API_BASE_URL;

export default function ProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [customWords, setCustomWords] = useState<CustomWordPair[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ wordA: '', wordB: '', category: '', difficulty: 'medium' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchCustomWords = useCallback(async () => {
    if (!user || user.uid.startsWith('guest_')) return;
    setWordsLoading(true);
    try {
      const res = await fetch(`${BASE}/profile/me/words`, { credentials: 'include' });
      const body = await res.json() as { data: CustomWordPair[] };
      if (body.data) setCustomWords(body.data);
    } catch { /* ignore */ }
    setWordsLoading(false);
  }, [user]);

  useEffect(() => { void fetchCustomWords(); }, [fetchCustomWords]);

  async function handleAddWord(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.wordA.trim() || !addForm.wordB.trim() || !addForm.category.trim()) {
      setAddError('All fields are required');
      return;
    }
    if (addForm.wordA.trim().toLowerCase() === addForm.wordB.trim().toLowerCase()) {
      setAddError('Word A and Word B must be different');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch(`${BASE}/profile/me/words`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordA: addForm.wordA.trim(),
          wordB: addForm.wordB.trim(),
          category: addForm.category.trim(),
          difficulty: addForm.difficulty,
        }),
      });
      const body = await res.json() as { data: CustomWordPair; error: { message?: string } | null };
      if (!res.ok) {
        setAddError(body.error?.message ?? 'Failed to add');
      } else {
        setCustomWords((prev) => [body.data, ...prev]);
        setAddForm({ wordA: '', wordB: '', category: '', difficulty: 'medium' });
        setShowAddForm(false);
      }
    } catch {
      setAddError('Network error');
    }
    setAddLoading(false);
  }

  async function handleDeleteWord(id: string) {
    const previous = customWords;
    setCustomWords((prev) => prev.filter((w) => w.id !== id));
    try {
      const response = await fetch(`${BASE}/profile/me/words/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
    } catch {
      setCustomWords(previous);
      void fetchCustomWords();
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4a5068', letterSpacing: '0.1em' }}>SIGN IN TO VIEW PROFILE</p>
        <button onClick={() => navigate('/lobby')} className="btn-secondary" style={{ maxWidth: 200 }}>BACK TO LOBBY</button>
      </div>
    );
  }

  const stats = (user as unknown as { stats?: UserStats }).stats ?? {};
  const tier = LEVEL_TO_TIER[user.level];
  const { current, total, pct } = getXpProgress(user.xp, user.level);
  const initials = (user.nickname || user.displayName || 'PK').slice(0, 2).toUpperCase();
  const unlockedSet = new Set(user.achievements);

  const statItems = [
    { label: 'GAMES PLAYED', value: stats.gamesPlayed ?? 0 },
    { label: 'CIVILIAN WINS', value: stats.wins?.civilian ?? 0 },
    { label: 'UNDERCOVER WINS', value: stats.wins?.undercover ?? 0 },
    { label: 'MR. WHITE WINS', value: stats.wins?.mr_white ?? 0 },
    { label: 'CORRECT VOTES', value: stats.correctVotes ?? 0 },
  ];

  const inputStyle: React.CSSProperties = {
    background: '#0d0f17',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 12,
    color: '#e3e2e8',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e3e2e8', padding: '20px 20px 100px', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#8c8a85', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: '0.1em' }}>
        BACK
      </button>

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(232,197,71,0.12)', border: '1px solid rgba(232,197,71,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#e8c547', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{user.nickname || user.displayName}</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: `${tier.color}15`, border: `1px solid ${tier.color}44`, borderRadius: 6, padding: '3px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: tier.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {tier.label}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8c8a85', letterSpacing: '0.08em' }}>{user.xp.toLocaleString()} XP</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.08em' }}>{total.toLocaleString()} XP</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div style={{ height: '100%', background: tier.color, borderRadius: 2 }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }} />
        </div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '4px 0 0', textAlign: 'center', letterSpacing: '0.08em' }}>
          {current.toLocaleString()} / {(total - tier.min).toLocaleString()} XP TO NEXT LEVEL
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>STATS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {statItems.map((item, idx) => (
            <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + idx * 0.05 }} style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 28, color: '#e8c547', margin: '0 0 2px' }}>{item.value.toLocaleString()}</p>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          ACHIEVEMENTS ({user.achievements.length}/{ACHIEVEMENTS.length})
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACHIEVEMENTS.map((ach, idx) => {
            const unlocked = unlockedSet.has(ach.id);
            return (
              <motion.div key={ach.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + idx * 0.04 }} style={{ background: unlocked ? 'rgba(232,197,71,0.06)' : '#12141c', border: `1px solid ${unlocked ? 'rgba(232,197,71,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: unlocked ? '#e8c547' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${unlocked ? 'rgba(232,197,71,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: unlocked ? '#e3e2e8' : '#4a5068', letterSpacing: '0.05em', lineHeight: 1.3 }}>{ach.name}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {!user.uid.startsWith('guest_') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
              CUSTOM WORD PAIRS ({customWords.length})
            </p>
            <button onClick={() => { setShowAddForm((v) => !v); setAddError(''); }} style={{ background: showAddForm ? 'rgba(232,197,71,0.1)' : 'none', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 6, padding: '4px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547', cursor: 'pointer', letterSpacing: '0.08em' }}>
              {showAddForm ? 'X CANCEL' : '+ ADD PAIR'}
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={(e) => { void handleAddWord(e); }} style={{ background: '#12141c', border: '1px solid rgba(232,197,71,0.15)', borderRadius: 12, padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>WORD A (CIVILIAN)</label>
                    <input style={inputStyle} placeholder="e.g. Coffee" value={addForm.wordA} onChange={(e) => setAddForm((f) => ({ ...f, wordA: e.target.value }))} maxLength={100} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>WORD B (UNDERCOVER)</label>
                    <input style={inputStyle} placeholder="e.g. Tea" value={addForm.wordB} onChange={(e) => setAddForm((f) => ({ ...f, wordB: e.target.value }))} maxLength={100} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CATEGORY</label>
                    <input style={inputStyle} placeholder="e.g. Food" value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} maxLength={50} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>DIFFICULTY</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={addForm.difficulty} onChange={(e) => setAddForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                {addError && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', margin: 0 }}>{addError}</p>}
                <button type="submit" disabled={addLoading} className="btn-primary" style={{ marginTop: 4 }}>{addLoading ? 'SAVING...' : 'SAVE PAIR'}</button>
              </motion.form>
            )}
          </AnimatePresence>

          {wordsLoading ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', textAlign: 'center', padding: '16px 0' }}>Loading...</p>
          ) : customWords.length === 0 ? (
            <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: 0, letterSpacing: '0.08em' }}>No custom pairs yet. Add one above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence>
                {customWords.map((pair) => (
                  <motion.div key={pair.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#3ecfb0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair.wordA}</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', flexShrink: 0 }}>vs</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#e84b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair.wordB}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.08em' }}>{pair.category.toUpperCase()}</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068' }}>.</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em', color: pair.difficulty === 'easy' ? '#3ecfb0' : pair.difficulty === 'medium' ? '#e8c547' : '#e84b4b' }}>{pair.difficulty.toUpperCase()}</span>
                      </div>
                    </div>
                    <button onClick={() => { void handleDeleteWord(pair.id); }} aria-label={`Delete ${pair.wordA} vs ${pair.wordB}`} style={{ background: 'rgba(232,75,75,0.08)', border: '1px solid rgba(232,75,75,0.2)', borderRadius: 6, padding: '6px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', cursor: 'pointer', flexShrink: 0, letterSpacing: '0.05em' }}>
                      DELETE
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
