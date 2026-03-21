import { motion, AnimatePresence } from 'framer-motion';

interface ExitConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmDialog({ visible, onConfirm, onCancel }: ExitConfirmDialogProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.8)',
            }}
            onClick={onCancel}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              background: '#1a1d2e',
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: '90%',
              border: '1px solid rgba(232, 197, 71, 0.2)',
            }}
          >
            <h3 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#e8c547',
              marginBottom: 12,
            }}>
              Exit Game?
            </h3>
            
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#8b92b0',
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              You'll lose all progress in this game. This cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
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
                CANCEL
              </button>
              
              <button
                onClick={onConfirm}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#e8c547',
                  border: 'none',
                  borderRadius: 8,
                  color: '#08090d',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                EXIT
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
