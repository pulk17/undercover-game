import { motion } from 'framer-motion';
import { getAlivePlayers } from '../utils/playerOrder';
import { tallyVotes } from '../utils/voteCounter';
import type { PnPPlayer, PnPVote } from '../../../../../shared/types';

interface VoteTallyScreenProps {
  players: PnPPlayer[];
  votes: PnPVote[];
  onContinue: () => void;
}

export default function VoteTallyScreen({ players, votes, onContinue }: VoteTallyScreenProps) {
  const alivePlayers = getAlivePlayers(players);
  const tallyResult = tallyVotes(votes, alivePlayers);

  // Count votes per player
  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    if (vote.targetId) {
      voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) || 0) + 1);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: '100vh',
        background: '#08090d',
        padding: '24px',
        paddingBottom: '100px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Vote Results
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e8c547',
            marginBottom: 16,
          }}>
            {tallyResult.wasTie
              ? 'It\'s a Tie!'
              : tallyResult.eliminatedPlayerId
              ? `${players.find(p => p.id === tallyResult.eliminatedPlayerId)?.name} is Eliminated`
              : 'No Elimination'}
          </h2>
        </div>

        {/* Vote breakdown */}
        <div style={{ marginBottom: 32 }}>
          {alivePlayers.map((player) => {
            const voteCount = voteCounts.get(player.id) || 0;
            const isEliminated = player.id === tallyResult.eliminatedPlayerId;
            const isTied = tallyResult.tiedPlayerIds.includes(player.id);

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  padding: 16,
                  marginBottom: 8,
                  background: isEliminated
                    ? 'rgba(232, 75, 75, 0.1)'
                    : isTied
                    ? 'rgba(232, 197, 71, 0.1)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${
                    isEliminated
                      ? 'rgba(232, 75, 75, 0.3)'
                      : isTied
                      ? 'rgba(232, 197, 71, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)'
                  }`,
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 14,
                  color: isEliminated ? '#e84b4b' : '#e3e2e8',
                }}>
                  {player.name}
                </span>
                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: isEliminated ? '#e84b4b' : isTied ? '#e8c547' : '#8b92b0',
                }}>
                  {voteCount}
                </span>
              </motion.div>
            );
          })}
        </div>

        <button
          onClick={onContinue}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          CONTINUE
        </button>
      </div>
    </motion.div>
  );
}
