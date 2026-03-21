import { motion } from 'framer-motion';
import { useCountdown } from '../hooks/useCountdown';

interface RoleRevealVisibleProps {
  word: string | null;
  role: 'CIVILIAN' | 'UNDERCOVER' | 'MR_WHITE';
  timerStart: number;
  onComplete: () => void;
  onCoverQuickly?: () => void;
}

export default function RoleRevealVisible({
  word,
  role,
  timerStart,
  onComplete,
  onCoverQuickly,
}: RoleRevealVisibleProps) {
  const { remaining, progress } = useCountdown(timerStart, 5, onComplete);

  const isMrWhite = role === 'MR_WHITE';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onCoverQuickly} // Tap anywhere to hide
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        cursor: 'pointer',
      }}
    >
      {/* Cover quickly hint */}
      <p style={{
        position: 'absolute',
        top: 24,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10,
        color: '#4a5068',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Tap to hide
      </p>

      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#4a5068',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          YOUR WORD
        </p>

        {isMrWhite ? (
          <div>
            <p style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 48,
              color: '#e84b4b',
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}>
              ???
            </p>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#8b92b0',
              lineHeight: 1.6,
              maxWidth: 280,
              margin: '0 auto',
            }}>
              You are Mr. White.
              <br />
              You have no word. Improvise!
            </p>
          </div>
        ) : (
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 48,
            color: role === 'UNDERCOVER' ? '#9b6fe8' : '#3ecfb0',
            letterSpacing: '-0.02em',
          }}>
            {word}
          </p>
        )}
      </div>

      {/* Countdown bar */}
      <div style={{ width: '100%', maxWidth: 280 }}>
        <div style={{
          width: '100%',
          height: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            style={{
              height: '100%',
              background: '#e8c547',
              borderRadius: 2,
            }}
          />
        </div>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#4a5068',
          textAlign: 'center',
          marginTop: 12,
        }}>
          {remaining}s remaining
        </p>
      </div>
    </motion.div>
  );
}
