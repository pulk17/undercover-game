import { motion } from 'framer-motion';

interface PrivacyGuardProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function PrivacyGuard({ visible, onDismiss }: PrivacyGuardProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 32,
      }}
    >
      <div style={{ fontSize: 48 }}>🔒</div>
      
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 20,
          fontWeight: 700,
          color: '#e8c547',
          marginBottom: 8,
        }}>
          Screen Was Hidden
        </p>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          color: '#4a5068',
          lineHeight: 1.6,
        }}>
          For privacy, the game was paused.
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="btn-primary"
        style={{ marginTop: 16 }}
      >
        I'M BACK
      </button>
    </motion.div>
  );
}
