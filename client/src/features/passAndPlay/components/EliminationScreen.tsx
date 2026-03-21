import { motion } from 'framer-motion';
import { usePassAndPlayStore } from '../store/passAndPlayStore';
import { tallyVotes } from '../utils/voteCounter';
import { getAlivePlayers } from '../utils/playerOrder';

export default function EliminationScreen() {
  const { players, votes, settings, confirmElimination } = usePassAndPlayStore();

  const alivePlayers = getAlivePlayers(players);
  const tallyResult = tallyVotes(votes, alivePlayers);
  
  const eliminatedPlayer = tallyResult.eliminatedPlayerId
    ? players.find(p => p.id === tallyResult.eliminatedPlayerId)
    : null;

  if (!eliminatedPlayer) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#08090d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e8c547',
            marginBottom: 16,
          }}>
            No Elimination
          </p>
          <button onClick={confirmElimination} className="btn-primary">
            CONTINUE TO NEXT ROUND
          </button>
        </div>
      </div>
    );
  }

  const roleColor = eliminatedPlayer.role === 'CIVILIAN'
    ? '#3ecfb0'
    : eliminatedPlayer.role === 'UNDERCOVER'
    ? '#9b6fe8'
    : '#e84b4b';

  const roleLabel = eliminatedPlayer.role === 'CIVILIAN'
    ? 'Civilian'
    : eliminatedPlayer.role === 'UNDERCOVER'
    ? 'Undercover'
    : 'Mr. White';

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
          Eliminated
        </p>
        
        <p style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 36,
          fontWeight: 800,
          color: '#e8c547',
          marginBottom: 24,
          letterSpacing: '-0.02em',
        }}>
          {eliminatedPlayer.name}
        </p>

        <div style={{
          padding: '12px 24px',
          background: `${roleColor}20`,
          border: `1px solid ${roleColor}40`,
          borderRadius: 8,
          display: 'inline-block',
        }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            color: roleColor,
            fontWeight: 600,
          }}>
            {roleLabel}
          </p>
        </div>

        {settings.postEliminationReveal && eliminatedPlayer.word && (
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 20,
            color: '#8b92b0',
            marginTop: 16,
          }}>
            Word: {eliminatedPlayer.word}
          </p>
        )}
      </motion.div>

      <button
        onClick={confirmElimination}
        className="btn-primary"
        style={{ maxWidth: 320 }}
      >
        CONTINUE
      </button>
    </motion.div>
  );
}
