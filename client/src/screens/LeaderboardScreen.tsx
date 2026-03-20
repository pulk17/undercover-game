import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { env } from '../env';
import { useRoomStore } from '../stores/roomStore';
import type { Level } from '../../../shared/types';

type Scope = 'global' | 'friends' | 'country' | 'room';

interface LeaderboardEntry {
  rank: number;
  uid: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: Level;
}

const LEVEL_COLORS: Record<Level, string> = {
  rookie: '#9ca3af',
  agent: '#60a5fa',
  operative: '#34d399',
  infiltrator: '#f59e0b',
  mastermind: '#f97316',
  phantom: '#E8C547',
};

const LEVEL_LABELS: Record<Level, string> = {
  rookie: 'Rookie',
  agent: 'Agent',
  operative: 'Operative',
  infiltrator: 'Infiltrator',
  mastermind: 'Mastermind',
  phantom: 'Phantom',
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="w-8 select-none text-center text-xl">1</span>;
  if (rank === 2) return <span className="w-8 select-none text-center text-xl">2</span>;
  if (rank === 3) return <span className="w-8 select-none text-center text-xl">3</span>;
  return (
    <span className="w-8 text-center text-sm font-bold tabular-nums" style={{ color: '#6b7280' }}>
      #{rank}
    </span>
  );
}

function EntryAvatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
  const initials = nickname.slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return <img src={avatarUrl} alt={nickname} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />;
  }

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{
        backgroundColor: '#12141c',
        border: '1px solid rgba(255,255,255,0.07)',
        color: '#e8c547',
      }}
    >
      {initials}
    </div>
  );
}

function LevelBadge({ level }: { level: Level }) {
  const color = LEVEL_COLORS[level] ?? '#9ca3af';
  const label = LEVEL_LABELS[level] ?? level;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  );
}

function EntryRow({ entry, index, isRoomScope }: { entry: LeaderboardEntry; index: number; isRoomScope: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-xl px-4 py-3 min-h-[56px]"
      style={{
        backgroundColor: '#12141c',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <RankBadge rank={entry.rank} />
      <EntryAvatar avatarUrl={entry.avatarUrl} nickname={entry.nickname} />
      <span className="flex-1 text-sm font-medium text-white truncate">{entry.nickname}</span>
      {!isRoomScope && <LevelBadge level={entry.level} />}
      <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: '#E8C547' }}>
        {entry.xp.toLocaleString()} {isRoomScope ? 'PTS' : 'XP'}
      </span>
    </motion.div>
  );
}

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const room = useRoomStore((state) => state.room);
  const availableTabs = useMemo(() => {
    const base: Array<{ id: Scope; label: string }> = [
      { id: 'global', label: 'Global' },
      { id: 'friends', label: 'Friends' },
      { id: 'country', label: 'Country' },
    ];

    if (room) {
      base.unshift({ id: 'room', label: 'Room' });
    }

    return base;
  }, [room]);

  const [scope, setScope] = useState<Scope>(room ? 'room' : 'global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scope === 'room' && !room) {
      setScope('global');
    }
  }, [room, scope]);

  const fetchLeaderboard = useCallback(async (nextScope: Scope) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: nextScope });
      if (nextScope === 'room' && room?.code) {
        params.set('code', room.code);
      }

      const res = await fetch(`${env.VITE_API_BASE_URL}/leaderboard?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
      }

      const json = (await res.json()) as { data: LeaderboardEntry[]; error: null };
      setEntries(json.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [room?.code]);

  useEffect(() => {
    void fetchLeaderboard(scope);
  }, [scope, fetchLeaderboard]);

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center px-4 py-8 max-w-md mx-auto"
      style={{ background: '#000', paddingBottom: 100 }}
    >
      <motion.div
        className="w-full mb-6"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center gap-2 text-sm font-medium active:scale-95 transition"
          style={{ color: '#9ca3af' }}
          aria-label="Go back"
        >
          Back
        </button>
      </motion.div>

      <motion.h1
        className="text-2xl font-bold text-white mb-6 self-start"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        Leaderboard
      </motion.h1>

      <div className="w-full flex gap-1 mb-6 border-b" style={{ borderColor: '#2a2a2a' }}>
        {availableTabs.map((tab) => {
          const isActive = tab.id === scope;
          return (
            <button
              key={tab.id}
              onClick={() => setScope(tab.id)}
              className="flex-1 min-h-[44px] text-sm font-semibold pb-2 transition-colors relative"
              style={{ color: isActive ? '#E8C547' : '#6b7280' }}
              aria-selected={isActive}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: '#E8C547' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="w-full flex flex-col gap-2">
        {isLoading && (
          <div className="flex justify-center py-16">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: '#E8C547', borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
          </div>
        )}

        {!isLoading && error && (
          <motion.div className="flex flex-col items-center gap-4 py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
            <button
              onClick={() => void fetchLeaderboard(scope)}
              className="min-h-[44px] px-6 rounded-xl text-sm font-semibold bg-[#1a1a1a] text-white border border-[#2a2a2a] active:scale-95 transition"
            >
              Retry
            </button>
          </motion.div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <motion.p className="text-center py-16 text-sm" style={{ color: '#6b7280' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            No entries yet.
          </motion.p>
        )}

        {!isLoading && !error && (
          <AnimatePresence mode="wait">
            <motion.div
              key={scope}
              className="flex flex-col gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {entries.map((entry, index) => (
                <EntryRow key={`${scope}-${entry.uid}`} entry={entry} index={index} isRoomScope={scope === 'room'} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
