import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PnPSettings } from '../../../../../shared/types';
import { env } from '../../../env';

interface SetupScreenProps {
  onStart: (names: string[], settings: PnPSettings, wordPair: { civilian: string; undercover: string }) => void;
}

const FALLBACK_CATEGORIES = ['general', 'food', 'travel', 'cinema', 'sports', 'tech'];
const DIFFICULTIES: Array<{ value: 'easy' | 'medium' | 'hard'; label: string; color: string }> = [
  { value: 'easy', label: 'Easy', color: '#3ecfb0' },
  { value: 'medium', label: 'Medium', color: '#e8c547' },
  { value: 'hard', label: 'Hard', color: '#e84b4b' },
];
const CLUE_TIMERS = [30, 60, 90];
const DISCUSSION_TIMERS = [60, 120, 180];

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [names, setNames] = useState<string[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [nameError, setNameError] = useState('');
  
  console.log('[SetupScreen] Rendered with', names.length, 'players');
  
  const [settings, setSettings] = useState<PnPSettings>({
    includeMrWhite: true,
    undercoverCount: 1,
    clueTimerSeconds: 60,
    discussionTimerSeconds: 120,
    tieResolution: 'revote',
    wordPeekAllowed: true,
    postEliminationReveal: true,
    detectiveEnabled: false,
    silentRoundEnabled: false,
    category: 'general',
    difficulty: 'medium',
    maxPlayers: 8,
  });

  const [clueUnlimited, setClueUnlimited] = useState(false);
  const [discussionUnlimited, setDiscussionUnlimited] = useState(false);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${env.VITE_API_BASE_URL}/words/categories`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setCategories(payload.data);
          if (!payload.data.includes(settings.category)) {
            setSettings(prev => ({ ...prev, category: payload.data[0] }));
          }
        }
      })
      .catch(() => {
        // Keep fallback categories
      })
      .finally(() => {
        setFetchingCategories(false);
      });

    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addName = () => {
    const trimmed = currentName.trim();
    
    if (!trimmed) {
      setNameError('Name cannot be empty');
      return;
    }
    
    if (names.includes(trimmed)) {
      setNameError('Name already added');
      return;
    }
    
    if (trimmed.length > 12) {
      setNameError('Name too long (max 12 characters)');
      return;
    }
    
    if (names.length >= settings.maxPlayers) {
      setNameError(`Maximum ${settings.maxPlayers} players`);
      return;
    }
    
    setNames([...names, trimmed]);
    setCurrentName('');
    setNameError('');
  };

  const removeName = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
  };

  const canStart = names.length >= 3;

  const handleStart = async () => {
    if (!canStart) return;
    
    console.log('[PnP Setup] Starting game with', names.length, 'players');
    setLoading(true);
    
    try {
      const finalSettings = {
        ...settings,
        clueTimerSeconds: clueUnlimited ? null : settings.clueTimerSeconds,
        discussionTimerSeconds: discussionUnlimited ? null : settings.discussionTimerSeconds,
      };

      console.log('[PnP Setup] Fetching word pair...');
      // Fetch word pair from server
      const response = await fetch(
        `${env.VITE_API_BASE_URL}/words/pairs?category=${finalSettings.category}&difficulty=${finalSettings.difficulty}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch words');
      }
      
      const result = await response.json();
      
      if (!result.data || result.data.length === 0) {
        throw new Error('No word pairs available');
      }
      
      // Pick a random word pair from the results
      const randomPair = result.data[Math.floor(Math.random() * result.data.length)];
      const wordPair = {
        civilian: randomPair.wordA,
        undercover: randomPair.wordB,
      };
      
      console.log('[PnP Setup] Word pair fetched, calling onStart');
      onStart(names, finalSettings, wordPair);
    } catch (error) {
      console.error('[PnP Setup] Failed to fetch words:', error);
      // Fallback to hardcoded words
      const fallbackPairs = [
        { civilian: 'Apple', undercover: 'Orange' },
        { civilian: 'Cat', undercover: 'Dog' },
        { civilian: 'Coffee', undercover: 'Tea' },
      ];
      const randomPair = fallbackPairs[Math.floor(Math.random() * fallbackPairs.length)];
      const finalSettings = {
        ...settings,
        clueTimerSeconds: clueUnlimited ? null : settings.clueTimerSeconds,
        discussionTimerSeconds: discussionUnlimited ? null : settings.discussionTimerSeconds,
      };
      console.log('[PnP Setup] Using fallback word pair, calling onStart');
      onStart(names, finalSettings, randomPair);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      padding: '24px',
      paddingBottom: '100px',
      overflowY: 'auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 28,
          fontWeight: 800,
          color: '#e8c547',
          marginBottom: 8,
        }}>
          Pass & Play Setup
        </h1>
        
        <div style={{
          background: 'rgba(155, 111, 232, 0.1)',
          border: '1px solid rgba(155, 111, 232, 0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
        }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#9b6fe8',
            margin: 0,
            letterSpacing: '0.05em',
          }}>
            ✓ OFFLINE MODE - No internet required after setup
          </p>
        </div>
        
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#4a5068',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          One device, multiple players. Everyone takes turns.
        </p>

        {/* Player Names */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Players ({names.length}/{settings.maxPlayers})
          </label>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={currentName}
              onChange={(e) => {
                setCurrentName(e.target.value);
                setNameError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && addName()}
              placeholder="Enter player name"
              maxLength={12}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${nameError ? '#e84b4b' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: 8,
                color: '#e3e2e8',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 13,
              }}
            />
            <button
              onClick={addName}
              style={{
                padding: '12px 20px',
                background: '#e8c547',
                border: 'none',
                borderRadius: 8,
                color: '#08090d',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ADD
            </button>
          </div>

          {nameError && (
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#e84b4b',
              marginBottom: 12,
            }}>
              {nameError}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {names.map((name, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(232, 197, 71, 0.1)',
                  border: '1px solid rgba(232, 197, 71, 0.3)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  color: '#e8c547',
                }}>
                  {name}
                </span>
                <button
                  onClick={() => removeName(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e84b4b',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Category {fetchingCategories && '(loading...)'}
          </label>
          <select
            value={settings.category}
            onChange={(e) => setSettings({ ...settings, category: e.target.value })}
            disabled={fetchingCategories}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#e3e2e8',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Difficulty
          </label>
          <div style={{
            display: 'flex',
            gap: 8,
            background: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: 4,
          }}>
            {DIFFICULTIES.map((difficulty) => {
              const active = settings.difficulty === difficulty.value;
              return (
                <button
                  key={difficulty.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, difficulty: difficulty.value })}
                  style={{
                    flex: 1,
                    height: 40,
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: active ? difficulty.color : 'transparent',
                    color: active ? '#000' : '#8c8a85',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {difficulty.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timers - Continued in next part */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Timers
          </label>
          <div style={{
            background: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <TimerRow
              label="Clue Timer"
              options={CLUE_TIMERS}
              selected={settings.clueTimerSeconds}
              unlimited={clueUnlimited}
              accent="#3ecfb0"
              onSelect={(value) => setSettings({ ...settings, clueTimerSeconds: value })}
              onToggleUnlimited={() => setClueUnlimited(!clueUnlimited)}
            />
            <TimerRow
              label="Discussion Timer"
              options={DISCUSSION_TIMERS}
              selected={settings.discussionTimerSeconds}
              unlimited={discussionUnlimited}
              accent="#e8c547"
              onSelect={(value) => setSettings({ ...settings, discussionTimerSeconds: value })}
              onToggleUnlimited={() => setDiscussionUnlimited(!discussionUnlimited)}
            />
          </div>
        </div>

        {/* Rules */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Rules
          </label>
          <div style={{
            background: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <ToggleRow
              label="Include Mr. White"
              checked={settings.includeMrWhite}
              onChange={(v) => setSettings({ ...settings, includeMrWhite: v })}
            />
            <ToggleRow
              label="Reveal word after elimination"
              checked={settings.postEliminationReveal}
              onChange={(v) => setSettings({ ...settings, postEliminationReveal: v })}
            />
            <ToggleRow
              label="Allow word peek"
              checked={settings.wordPeekAllowed}
              onChange={(v) => setSettings({ ...settings, wordPeekAllowed: v })}
            />
            <ToggleRow
              label="Detective mode"
              checked={settings.detectiveEnabled}
              onChange={(v) => setSettings({ ...settings, detectiveEnabled: v })}
            />
            <ToggleRow
              label="Silent round"
              checked={settings.silentRoundEnabled}
              onChange={(v) => setSettings({ ...settings, silentRoundEnabled: v })}
            />
          </div>
        </div>

        {/* Additional Settings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 24,
        }}>
          <div style={{
            background: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: '#4a5068',
              margin: '0 0 6px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Player Cap
            </p>
            <input
              type="number"
              min={3}
              max={12}
              value={settings.maxPlayers}
              onChange={(e) => setSettings({
                ...settings,
                maxPlayers: Math.max(3, Math.min(12, Number(e.target.value) || 3))
              })}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 24,
                color: '#e8c547',
                outline: 'none',
              }}
            />
          </div>

          <div style={{
            background: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: '#4a5068',
              margin: '0 0 6px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Undercover
            </p>
            <select
              value={settings.undercoverCount}
              onChange={(e) => setSettings({
                ...settings,
                undercoverCount: Number(e.target.value) as 1 | 2
              })}
              style={{
                width: '100%',
                height: 40,
                background: '#0d0f17',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: '#e3e2e8',
                padding: '0 10px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                outline: 'none',
              }}
            >
              <option value={1}>1 Undercover</option>
              <option value={2}>2 Undercoverts</option>
            </select>
          </div>
        </div>

        {/* Tie Resolution */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#8b92b0',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}>
            Tie Resolution
          </label>
          <select
            value={settings.tieResolution}
            onChange={(e) => setSettings({
              ...settings,
              tieResolution: e.target.value as 'revote' | 'random' | 'skip_round'
            })}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#e3e2e8',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
            }}
          >
            <option value="revote">Re-vote</option>
            <option value="random">Random</option>
            <option value="skip_round">No elimination</option>
          </select>
        </div>

        {/* Start Button */}
        <button
          onClick={() => {
            console.log('[SetupScreen] START GAME button clicked, canStart:', canStart, 'loading:', loading);
            handleStart();
          }}
          disabled={!canStart || loading}
          style={{
            width: '100%',
            padding: '16px',
            background: canStart ? '#e8c547' : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 8,
            color: canStart ? '#08090d' : '#4a5068',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.1em',
            cursor: canStart ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'LOADING...' : canStart ? 'START GAME' : 'ADD AT LEAST 3 PLAYERS'}
        </button>
      </motion.div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div style={{
      minHeight: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '0 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>
        {label}
      </span>
      <button
        type="button"
        className={checked ? 'toggle-on' : 'toggle-off'}
        onClick={() => onChange(!checked)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-pressed={checked}
      >
        <div className="toggle-track">
          <div className="toggle-thumb" />
        </div>
      </button>
    </div>
  );
}

function TimerRow({
  label,
  options,
  selected,
  unlimited,
  accent,
  onSelect,
  onToggleUnlimited,
}: {
  label: string;
  options: number[];
  selected: number | null;
  unlimited: boolean;
  accent: string;
  onSelect: (value: number) => void;
  onToggleUnlimited: () => void;
}) {
  return (
    <div style={{
      minHeight: 62,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {unlimited ? (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: accent,
            letterSpacing: '0.08em',
          }}>
            NO LIMIT
          </span>
        ) : (
          options.map((value) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSelect(value)}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: `1px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`,
                  background: active ? accent : 'transparent',
                  color: active ? '#000' : '#8c8a85',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {value}s
              </button>
            );
          })
        )}
        <button
          type="button"
          onClick={onToggleUnlimited}
          style={{
            height: 28,
            padding: '0 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#4a5068',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          {unlimited ? 'USE TIMER' : 'NO LIMIT'}
        </button>
      </div>
    </div>
  );
}
