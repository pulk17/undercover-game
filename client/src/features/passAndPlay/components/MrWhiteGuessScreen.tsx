import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePassAndPlayStore } from '../store/passAndPlayStore';
import { useCountdown } from '../hooks/useCountdown';

export default function MrWhiteGuessScreen() {
  const { submitMrWhiteGuess } = usePassAndPlayStore();
  const [guess, setGuess] = useState('');
  const [timerStart] = useState(Date.now());

  const { remaining } = useCountdown(timerStart, 10, () => {
    if (!guess.trim()) {
      submitMrWhiteGuess('');
    }
  });

  const handleSubmit = () => {
    submitMrWhiteGuess(guess);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: '100vh',
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Mr. White's Last Chance
          </p>
          
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e84b4b',
            marginBottom: 16,
          }}>
            Guess the Civilian Word
          </p>

          {remaining !== null && (
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 14,
              color: '#8b92b0',
            }}>
              {remaining}s remaining
            </p>
          )}
        </div>

        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter your guess..."
          autoFocus
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            color: '#e3e2e8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 16,
            marginBottom: 16,
            textAlign: 'center',
          }}
        />

        <button
          onClick={handleSubmit}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          SUBMIT GUESS
        </button>
      </div>
    </motion.div>
  );
}
