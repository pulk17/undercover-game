import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore } from '../stores/roomStore';
import { env } from '../env';
import type { Difficulty, GameConfig, GameMode } from '../../../shared/types';
import {
  TargetIcon,
  ZapIcon,
  HandshakeIcon,
  MasksIcon,
  RefreshIcon,
  UsersIcon,
  TrophyIcon,
  GlobeIcon,
  PawIcon,
  TvIcon,
  BrainIcon,
  FilmIcon,
  BuildingIcon,
  MapIcon,
  SwordsIcon,
  UtensilsIcon,
  ScrollIcon,
  PartyPopperIcon,
  BriefcaseIcon,
  LanguagesIcon,
  ClapperboardIcon,
  MusicIcon,
  SparklesIcon,
  LeafIcon,
  BookOpenIcon,
  FlaskIcon,
  RocketIcon,
  FootballIcon,
  LaptopIcon,
  PlaneIcon,
  CookingPotIcon,
} from '../components/Icons';

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
  customWordPair: null,
  maxPlayers: 8,
};

const MODE_OPTIONS: Array<{
  value: GameMode;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  desc: string;
}> = [
  { value: 'classic', label: 'Classic', Icon: TargetIcon, desc: 'Standard rules and pacing' },
  { value: 'speed_round', label: 'Speed', Icon: ZapIcon, desc: 'Short timers and fast rounds' },
  { value: 'secret_alliance', label: 'Alliance', Icon: HandshakeIcon, desc: 'Two allied undercover players' },
  { value: 'double_agent', label: 'Double Agent', Icon: MasksIcon, desc: 'Two undercover players' },
  { value: 'reverse_mode', label: 'Reverse', Icon: RefreshIcon, desc: 'Undercover majority mode' },
  { value: 'mr_white_army', label: 'White Army', Icon: UsersIcon, desc: 'Multiple Mr. Whites' },
  { value: 'tournament', label: 'Tournament', Icon: TrophyIcon, desc: 'Carry points across rematches' },
];

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  general: GlobeIcon,
  animals: PawIcon,
  animated_shows: TvIcon,
  brainrot: BrainIcon,
  childhood_movies: FilmIcon,
  cities: BuildingIcon,
  countries: MapIcon,
  famous_rivalries: SwordsIcon,
  food: UtensilsIcon,
  history: ScrollIcon,
  holidays: PartyPopperIcon,
  indian_breakfast: CookingPotIcon,
  indian_fast_food: CookingPotIcon,
  jobs: BriefcaseIcon,
  languages: LanguagesIcon,
  movies: ClapperboardIcon,
  music_genres: MusicIcon,
  mythology: SparklesIcon,
  nature: LeafIcon,
  school_subjects: BookOpenIcon,
  science: FlaskIcon,
  space: RocketIcon,
  sports: FootballIcon,
  tech: LaptopIcon,
  travel: PlaneIcon,
  cinema: ClapperboardIcon,
};

const FALLBACK_CATEGORIES = ['general', 'food', 'travel', 'cinema', 'sports', 'tech'];
const DIFFICULTIES: Array<{ value: Difficulty; label: string; color: string }> = [
  { value: 'easy', label: 'Easy', color: '#3ecfb0' },
  { value: 'medium', label: 'Medium', color: '#e8c547' },
  { value: 'hard', label: 'Hard', color: '#e84b4b' },
];
const CLUE_TIMERS = [30, 60, 90];
const DISCUSSION_TIMERS = [60, 120, 180];

async function hashPassword(password: string): Promise<string | null> {
  if (!password) return null;
  if (!crypto?.subtle) {
    throw new Error('Secure password hashing is unavailable in this browser.');
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.18em',
        color: '#4a5068',
        textTransform: 'uppercase',
        margin: '0 0 10px',
      }}
    >
      {children}
    </p>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
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
  );
}

export default function CreateRoomScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createRoom, updateRoomConfig, room, error, isConnected } = useRoomStore();

  const isEditing = searchParams.get('edit') === '1' && Boolean(room);
  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const [password, setPassword] = useState('');
  const [clueUnlimited, setClueUnlimited] = useState(false);
  const [discussionUnlimited, setDiscussionUnlimited] = useState(false);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${env.VITE_API_BASE_URL}/words/categories`, { credentials: 'include', signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!Array.isArray(payload.data) || payload.data.length === 0) return;

        setCategories(payload.data);
        setConfig((previous) => {
          const nextCategories = previous.categories.filter((value) => payload.data.includes(value));
          return {
            ...previous,
            categories: nextCategories.length > 0 ? nextCategories : [payload.data[0]],
          };
        });
      })
      .catch(() => {
        // Keep fallback categories when the API is unavailable.
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isEditing || !room) return;

    setConfig(room.config);
    setClueUnlimited(room.config.clueTimerSeconds === null);
    setDiscussionUnlimited(room.config.discussionTimerSeconds === null);
  }, [isEditing, room]);

  const submitLabel = useMemo(() => {
    if (submitting) {
      return isEditing ? 'Saving...' : 'Creating...';
    }
    if (!isConnected) {
      return 'Connecting...';
    }
    return isEditing ? 'Save Settings' : 'Start Lobby';
  }, [isConnected, isEditing, submitting]);

  function setField<K extends keyof GameConfig>(key: K, value: GameConfig[K]) {
    setConfig((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmissionError('');
    if (!isConnected) {
      setSubmissionError('The server is still reconnecting. Please try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const passwordHash = password ? await hashPassword(password) : null;
      const nextConfig: GameConfig = {
        ...config,
        clueTimerSeconds: clueUnlimited ? null : config.clueTimerSeconds,
        discussionTimerSeconds: discussionUnlimited ? null : config.discussionTimerSeconds,
      };

      if (isEditing) {
        await updateRoomConfig(nextConfig, password ? passwordHash : undefined);
      } else {
        await createRoom(nextConfig, passwordHash);
      }

      navigate('/lobby');
    } catch (caught) {
      setSubmissionError(caught instanceof Error ? caught.message : 'Unable to save room settings');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCategory(category: string) {
    const isActive = config.categories.includes(category);
    if (isActive && config.categories.length === 1) return;

    setField(
      'categories',
      isActive
        ? config.categories.filter((value) => value !== category)
        : [...config.categories, category],
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e3e2e8', paddingBottom: 100 }}>
      <div
        style={{
          padding: '24px 20px 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#4a5068',
              letterSpacing: '0.16em',
              margin: '0 0 6px',
              textTransform: 'uppercase',
            }}
          >
            Control Panel
          </p>
          <h1
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 24,
              lineHeight: 1.05,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {isEditing ? 'Party Settings' : 'Create Room'}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#8c8a85',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            padding: '6px 0',
            flexShrink: 0,
          }}
        >
          CLOSE
        </button>
      </div>

      {!isConnected && (
        <div
          style={{
            margin: '14px 20px 0',
            background: 'rgba(232,75,75,0.08)',
            border: '1px solid rgba(232,75,75,0.24)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#e84b4b',
              margin: 0,
              letterSpacing: '0.06em',
            }}
          >
            Not connected. Waiting for the server to come back.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SectionLabel>Game Mode</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {MODE_OPTIONS.map((mode) => {
              const active = config.mode === mode.value;
              const IconComponent = mode.Icon;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setField('mode', mode.value)}
                  style={{
                    minHeight: 94,
                    background: active ? 'rgba(232,197,71,0.09)' : '#12141c',
                    border: `1px solid ${active ? '#e8c547' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 14,
                    padding: '14px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <IconComponent size={28} color={active ? '#e8c547' : '#8c8a85'} />
                  <div>
                    <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#e3e2e8', margin: '0 0 4px' }}>
                      {mode.label}
                    </p>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: active ? '#c8b466' : '#4a5068', margin: 0, lineHeight: 1.5 }}>
                      {mode.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <SectionLabel>Categories</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((category) => {
              const active = config.categories.includes(category);
              const IconComponent = CATEGORY_ICON_MAP[category] || GlobeIcon;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  style={{
                    minWidth: 92,
                    height: 56,
                    background: active ? 'rgba(62,207,176,0.08)' : '#12141c',
                    border: `1px solid ${active ? '#3ecfb0' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12,
                    padding: '0 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <IconComponent size={18} color={active ? '#3ecfb0' : '#8c8a85'} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: active ? '#e3e2e8' : '#8c8a85' }}>
                    {category.replace(/_/g, ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <SectionLabel>Difficulty</SectionLabel>
          <div style={{ display: 'flex', gap: 8, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 4 }}>
            {DIFFICULTIES.map((difficulty) => {
              const active = config.difficulty === difficulty.value;
              return (
                <button
                  key={difficulty.value}
                  type="button"
                  onClick={() => setField('difficulty', difficulty.value)}
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
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <SectionLabel>Timers</SectionLabel>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <TimerRow
              label="Clue Timer"
              options={CLUE_TIMERS}
              selected={config.clueTimerSeconds}
              unlimited={clueUnlimited}
              accent="#3ecfb0"
              onSelect={(value) => setField('clueTimerSeconds', value)}
              onToggleUnlimited={() => setClueUnlimited((value) => !value)}
            />
            <TimerRow
              label="Discussion Timer"
              options={DISCUSSION_TIMERS}
              selected={config.discussionTimerSeconds}
              unlimited={discussionUnlimited}
              accent="#e8c547"
              onSelect={(value) => setField('discussionTimerSeconds', value)}
              onToggleUnlimited={() => setDiscussionUnlimited((value) => !value)}
            />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <SectionLabel>Rules</SectionLabel>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <ToggleRow label="Reveal role after elimination" checked={config.postEliminationReveal} onChange={(value) => setField('postEliminationReveal', value)} />
            <ToggleRow label="Detective mode" checked={config.detectiveEnabled} onChange={(value) => setField('detectiveEnabled', value)} />
            <ToggleRow label="Silent round" checked={config.silentRoundEnabled} onChange={(value) => setField('silentRoundEnabled', value)} />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Player Cap
            </p>
            <input
              type="number"
              min={3}
              max={12}
              value={config.maxPlayers}
              onChange={(event) => setField('maxPlayers', Math.max(3, Math.min(12, Number(event.target.value) || 3)))}
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
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8c8a85', margin: '4px 0 0' }}>
              3 to 12 players
            </p>
          </div>

          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Tie Rule
            </p>
            <select
              value={config.tieResolution}
              onChange={(event) => setField('tieResolution', event.target.value as GameConfig['tieResolution'])}
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
              <option value="re_vote">Re-vote</option>
              <option value="random">Random</option>
              <option value="all_survive">No elimination</option>
            </select>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <SectionLabel>Room Password</SectionLabel>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Optional"
            style={{
              width: '100%',
              height: 50,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.07)',
              background: '#12141c',
              color: '#e3e2e8',
              padding: '0 14px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </motion.section>

        {(submissionError || error) && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e84b4b', margin: 0 }}>
            {submissionError || error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={submitting || !isConnected} style={{ height: 56 }}>
          {submitLabel}
        </button>
      </form>
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
    <div
      style={{
        minHeight: 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} />
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
    <div
      style={{
        minHeight: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {unlimited ? (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: accent, letterSpacing: '0.08em' }}>
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
