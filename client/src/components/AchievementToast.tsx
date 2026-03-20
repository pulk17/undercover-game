import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../stores/roomStore';

function formatTitle(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AchievementToast() {
  const [queue, setQueue] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onAchievementUnlocked({ achievement }: { achievement: string }) {
      setQueue((prev) => [...prev, achievement]);
    }

    socket.on('achievement:unlocked', onAchievementUnlocked);
    return () => {
      socket.off('achievement:unlocked', onAchievementUnlocked);
    };
  }, []);

  // Dequeue: show next when current is empty and queue has items
  useEffect(() => {
    if (current === null && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [current, queue]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (current === null) return;

    timerRef.current = setTimeout(() => {
      setCurrent(null);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {current !== null && (
          <motion.div
            key={current}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg"
            style={{ backgroundColor: '#12141c', border: '1px solid rgba(232,197,71,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5)' }}
          >
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#E8C547' }}>
                Achievement Unlocked!
              </p>
              <p className="text-sm font-bold text-white">{formatTitle(current)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
