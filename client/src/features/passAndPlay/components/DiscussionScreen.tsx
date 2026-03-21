import { motion } from 'framer-motion';
import { usePassAndPlayStore } from '../store/passAndPlayStore';
import { useCountdown } from '../hooks/useCountdown';

export default function DiscussionScreen() {
  const {
    players,
    clues,
    currentRound,
    discussionTimerStart,
    settings,
    startVoting,
  } = usePassAndPlayStore();

  const roundClues = clues.filter(c => c.roundNumber === currentRound);

  const { remaining } = useCountdown(
    discussionTimerStart,
    settings.discussionTimerSeconds,
    startVoting
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      padding: '24px',
      paddingBottom: '100px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Round {currentRound} · Discussion
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e8c547',
            marginBottom: 8,
          }}>
            Discuss & Decide
          </h2>
          {remaining !== null && (
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#8b92b0',
            }}>
              {remaining}s remaining
            </p>
          )}
        </div>

        {/* All clues */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            All Clues
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roundClues.map((clue, i) => {
              const player = players.find(p => p.id === clue.playerId);
              return (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <p style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 10,
                    color: '#4a5068',
                    marginBottom: 4,
                  }}>
                    {player?.name}
                  </p>
                  <p style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 14,
                    color: clue.timedOut ? '#e84b4b' : '#e3e2e8',
                  }}>
                    {clue.clue || '(skipped)'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start voting button */}
        <button
          onClick={startVoting}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          START VOTING
        </button>
      </motion.div>
    </div>
  );
}
