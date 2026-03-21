import { motion } from 'framer-motion';

interface RoleRevealHiddenProps {
  playerName: string;
  canPeek: boolean;
  onPeek: () => void;
  onConfirm: () => void;
}

export default function RoleRevealHidden({
  playerName,
  canPeek,
  onPeek,
  onConfirm,
}: RoleRevealHiddenProps) {
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
        gap: 24,
        padding: '32px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: 20,
          color: '#e8c547',
          marginBottom: 12,
        }}>
          {playerName}, did you see your word?
        </p>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          color: '#8b92b0',
          lineHeight: 1.6,
          maxWidth: 280,
          margin: '0 auto',
        }}>
          {canPeek
            ? 'You can peek one more time if you missed it.'
            : 'Confirm to continue to the next player.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <button
          onClick={onConfirm}
          className="btn-primary"
        >
          I'VE SEEN IT
        </button>

        {canPeek && (
          <button
            onClick={onPeek}
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#8b92b0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            PEEK AGAIN (3s)
          </button>
        )}
      </div>
    </motion.div>
  );
}
