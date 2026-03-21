import { motion } from 'framer-motion';

interface VoteCoverScreenProps {
  voterName: string;
  onReady: () => void;
}

export default function VoteCoverScreen({ voterName, onReady }: VoteCoverScreenProps) {
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
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#4a5068',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Pass To
        </p>
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 36,
          color: '#e8c547',
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>
          {voterName.toUpperCase()}
        </p>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#4a5068',
          lineHeight: 1.6,
        }}>
          to vote
        </p>
      </div>

      <button onClick={onReady} className="btn-primary" style={{ maxWidth: 280 }}>
        I'M READY TO VOTE
      </button>
    </motion.div>
  );
}
