import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAlivePlayers } from '../utils/playerOrder';
import type { PnPPlayer } from '../../../../../shared/types';

interface VoteActiveScreenProps {
  players: PnPPlayer[];
  currentVoterId: string;
  onVote: (targetId: string | null) => void;
}

export default function VoteActiveScreen({ players, currentVoterId, onVote }: VoteActiveScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  
  const alivePlayers = getAlivePlayers(players);
  const currentVoter = alivePlayers.find(p => p.id === currentVoterId);

  const handleConfirm = () => {
    onVote(selected);
  };

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
            Voting
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e8c547',
            marginBottom: 8,
          }}>
            {currentVoter?.name}, who do you vote to eliminate?
          </h2>
        </div>

        {/* Player list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {alivePlayers.map((player) => {
            const isSelf = player.id === currentVoterId;
            const isSelected = selected === player.id;

            return (
              <button
                key={player.id}
                onClick={() => !isSelf && setSelected(player.id)}
                disabled={isSelf}
                style={{
                  padding: 16,
                  background: isSelected
                    ? 'rgba(232, 197, 71, 0.2)'
                    : isSelf
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${
                    isSelected
                      ? 'rgba(232, 197, 71, 0.4)'
                      : 'rgba(255, 255, 255, 0.1)'
                  }`,
                  borderRadius: 8,
                  color: isSelf ? '#4a5068' : '#e3e2e8',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: isSelf ? 'not-allowed' : 'pointer',
                  opacity: isSelf ? 0.5 : 1,
                }}
              >
                {player.name}
                {isSelf && ' (you)'}
              </button>
            );
          })}

          {/* Abstain option */}
          <button
            onClick={() => setSelected(null)}
            style={{
              padding: 16,
              background: selected === null
                ? 'rgba(232, 197, 71, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${
                selected === null
                  ? 'rgba(232, 197, 71, 0.4)'
                  : 'rgba(255, 255, 255, 0.1)'
              }`,
              borderRadius: 8,
              color: '#8b92b0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 14,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Abstain (no vote)
          </button>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={selected === undefined}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          CONFIRM VOTE
        </button>
      </div>
    </motion.div>
  );
}
