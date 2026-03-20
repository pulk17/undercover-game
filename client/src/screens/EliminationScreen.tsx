import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../stores/roomStore';
import type { Role } from '../../../shared/types';

interface EliminationPayload {
  eliminatedPlayerId: string;
  role: Role | null;
  nickname: string;
}

function roleColor(role: Role): string {
  switch (role) {
    case 'undercover': return '#e84b4b';
    case 'mr_white':   return '#9b6fe8';
    case 'detective':  return '#e8c547';
    default:           return '#3ecfb0';
  }
}

function roleLabel(role: Role): string {
  switch (role) {
    case 'undercover': return 'UNDERCOVER';
    case 'mr_white':   return 'MR. WHITE';
    case 'detective':  return 'DETECTIVE';
    default:           return 'CIVILIAN';
  }
}

interface ParticleProps { x: number; y: number; size: number; color: string; delay: number; }
function Particle({ x, y, size, color, delay }: ParticleProps) {
  return (
    <motion.div
      style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', backgroundColor: color, top: '50%', left: '50%', marginTop: -size / 2, marginLeft: -size / 2, pointerEvents: 'none' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay }}
    />
  );
}

function ParticleBurst({ color }: { color: string }) {
  const particles = useMemo(() => {
    const count = 24;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 300,
      size: Math.random() * 4 + 4,
      color: Math.random() > 0.5 ? color : '#e8c547',
      delay: Math.random() * 0.15,
    }));
  }, [color]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => <Particle key={p.id} {...p} />)}
    </div>
  );
}

export default function EliminationScreen() {
  const { gameState } = useGameStore();
  const [elimination, setElimination] = useState<EliminationPayload | null>(null);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    function onElimination(payload: EliminationPayload) {
      setElimination(payload);
      setBurst(true);
    }
    socket.on('game:elimination', onElimination);
    return () => { socket.off('game:elimination', onElimination); };
  }, []);

  const nickname = elimination?.nickname ?? gameState?.eliminatedThisRound ?? '—';
  const role = elimination?.role ?? null;
  const color = role ? roleColor(role) : '#e84b4b';
  const initials = nickname.slice(0, 2).toUpperCase();

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#08090d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 24,
      overflow: 'hidden',
    }}>
      {burst && <ParticleBurst color={color} />}

      {/* Header */}
      <motion.p
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}
      >
        OPERATIVE ELIMINATED
      </motion.p>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 160, damping: 18 }}
        style={{
          background: '#12141c',
          border: `1px solid ${color}33`,
          borderRadius: 20,
          padding: '32px 32px',
          width: '100%',
          maxWidth: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5), 0 0 40px ${color}11`,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 22,
          color,
        }}>
          {initials}
        </div>

        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#e3e2e8', margin: 0, letterSpacing: '-0.01em' }}>
          {nickname.toUpperCase()}
        </p>

        {/* Role badge */}
        {role !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4, type: 'spring' }}
            style={{
              background: `${color}22`,
              border: `1px solid ${color}55`,
              borderRadius: 4,
              padding: '5px 14px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              color,
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {roleLabel(role)}
          </motion.div>
        )}

        {role === null && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', letterSpacing: '0.1em' }}>ROLE CLASSIFIED</p>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.1em' }}
      >
        CONTINUING AUTOMATICALLY…
      </motion.p>
    </div>
  );
}
