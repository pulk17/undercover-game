import { motion } from 'framer-motion';

interface RoleRevealCoverProps {
  playerName: string;
  onReady: () => void;
}

export default function RoleRevealCover({ playerName, onReady }: RoleRevealCoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '0 32px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#4a5068',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          Pass The Device To
        </p>
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 36,
          color: '#e8c547',
          margin: 0,
          letterSpacing: '-0.02em',
          wordBreak: 'break-word',
          maxWidth: 280,
          textAlign: 'center',
        }}>
          {playerName.toUpperCase()}
        </p>
      </div>

      <div style={{ width: 40, height: 1, background: 'rgba(232,197,71,0.3)' }} />

      <p style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11,
        color: '#4a5068',
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 1.6,
        letterSpacing: '0.05em',
      }}>
        Make sure no one else is looking at the screen before tapping Ready.
      </p>

      <button
        onClick={onReady}
        className="btn-primary"
        style={{ maxWidth: 280 }}
      >
        I AM READY
      </button>
    </motion.div>
  );
}
