import { motion } from 'framer-motion';
import { usePassAndPlayStore } from '../store/passAndPlayStore';

export default function GameOverScreen() {
  const { players, winner, wordPair, resetGame } = usePassAndPlayStore();

  const winnerLabel = winner === 'CIVILIAN'
    ? 'Civilians Win!'
    : winner === 'UNDERCOVER'
    ? 'Undercoverts Win!'
    : 'Mr. White Wins!';

  const winnerColor = winner === 'CIVILIAN'
    ? '#3ecfb0'
    : winner === 'UNDERCOVER'
    ? '#9b6fe8'
    : '#e84b4b';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: '100vh',
        background: '#08090d',
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Game Over
          </p>
          
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 36,
            fontWeight: 800,
            color: winnerColor,
            marginBottom: 24,
            letterSpacing: '-0.02em',
          }}>
            {winnerLabel}
          </p>

          {/* Word reveal */}
          <div style={{
            padding: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#4a5068',
              marginBottom: 8,
            }}>
              The Words Were
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div>
                <p style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 9,
                  color: '#4a5068',
                  marginBottom: 4,
                }}>
                  CIVILIAN
                </p>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#3ecfb0',
                }}>
                  {wordPair.civilian}
                </p>
              </div>
              <div>
                <p style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 9,
                  color: '#4a5068',
                  marginBottom: 4,
                }}>
                  UNDERCOVER
                </p>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#9b6fe8',
                }}>
                  {wordPair.undercover}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Role reveal table */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            All Roles
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player) => {
              const roleColor = player.role === 'CIVILIAN'
                ? '#3ecfb0'
                : player.role === 'UNDERCOVER'
                ? '#9b6fe8'
                : '#e84b4b';

              const roleLabel = player.role === 'CIVILIAN'
                ? 'Civilian'
                : player.role === 'UNDERCOVER'
                ? 'Undercover'
                : 'Mr. White';

              return (
                <div
                  key={player.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    border: `1px solid ${roleColor}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 13,
                      color: '#e3e2e8',
                      marginBottom: 2,
                    }}>
                      {player.name}
                      {!player.isAlive && ' ☠'}
                    </p>
                    <p style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      color: '#4a5068',
                    }}>
                      {player.word || '???'}
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    background: `${roleColor}20`,
                    borderRadius: 6,
                  }}>
                    <p style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      color: roleColor,
                      fontWeight: 600,
                    }}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={resetGame}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            NEW GAME
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#8b92b0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            EXIT TO MENU
          </button>
        </div>
      </div>
    </motion.div>
  );
}
