import { motion } from 'framer-motion';

interface RoleRevealTapToShowProps {
  playerName: string;
  onTap: () => void;
}

export default function RoleRevealTapToShow({ playerName, onTap }: RoleRevealTapToShowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '0 32px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#4a5068',
          marginBottom: 16,
          letterSpacing: '0.1em',
        }}>
          I AM
        </p>
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 32,
          color: '#e8c547',
          marginBottom: 32,
          letterSpacing: '-0.02em',
        }}>
          {playerName.toUpperCase()}
        </p>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          color: '#8b92b0',
          lineHeight: 1.6,
          maxWidth: 280,
          margin: '0 auto',
        }}>
          Only tap if you are {playerName}.
          <br />
          Your word will be shown for a few seconds.
        </p>
      </div>

      <motion.button
        onClick={onTap}
        className="btn-primary"
        whileTap={{ scale: 0.95 }}
        style={{ maxWidth: 280 }}
      >
        TAP TO SEE MY WORD
      </motion.button>
    </motion.div>
  );
}
