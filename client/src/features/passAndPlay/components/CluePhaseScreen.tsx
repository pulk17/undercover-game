import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePassAndPlayStore } from '../store/passAndPlayStore';
import { getAlivePlayers } from '../utils/playerOrder';
import { useCountdown } from '../hooks/useCountdown';

export default function CluePhaseScreen() {
  const {
    players,
    clues,
    currentRound,
    clueCurrentIndex,
    clueTimerStart,
    settings,
    submitClue,
    timeoutClue,
  } = usePassAndPlayStore();

  const [showInput, setShowInput] = useState(false);
  const [clueText, setClueText] = useState('');

  const alivePlayers = getAlivePlayers(players);
  const currentPlayer = alivePlayers[clueCurrentIndex];
  const roundClues = clues.filter(c => c.roundNumber === currentRound);

  const { remaining } = useCountdown(
    clueTimerStart,
    settings.clueTimerSeconds,
    timeoutClue
  );

  const handleSubmit = () => {
    if (!clueText.trim()) return;
    submitClue(clueText);
    setClueText('');
    setShowInput(false);
  };

  const handleSkip = () => {
    submitClue('');
    setShowInput(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      padding: '24px',
      paddingBottom: '80px',
    }}>
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
            Round {currentRound} · Clue Phase
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: '#e8c547',
            marginBottom: 8,
          }}>
            {currentPlayer.name}'s Turn
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

        {/* Turn order */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#4a5068',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Turn Order
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {alivePlayers.map((player, i) => {
              const hasGivenClue = roundClues.some(c => c.playerId === player.id);
              const isCurrent = i === clueCurrentIndex;
              
              return (
                <div
                  key={player.id}
                  style={{
                    padding: '6px 12px',
                    background: isCurrent
                      ? 'rgba(232, 197, 71, 0.2)'
                      : hasGivenClue
                      ? 'rgba(62, 207, 176, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${
                      isCurrent
                        ? 'rgba(232, 197, 71, 0.4)'
                        : hasGivenClue
                        ? 'rgba(62, 207, 176, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }`,
                    borderRadius: 6,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    color: isCurrent ? '#e8c547' : hasGivenClue ? '#3ecfb0' : '#8b92b0',
                  }}
                >
                  {player.name}
                  {hasGivenClue && ' ✓'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Clue log */}
        {roundClues.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#4a5068',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Clues This Round
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
                      fontSize: 13,
                      color: clue.timedOut ? '#e84b4b' : '#e3e2e8',
                    }}>
                      {clue.clue || '(skipped)'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Give clue button */}
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            GIVE CLUE
          </button>
        )}

        {/* Clue input modal */}
        {showInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
            }}
          >
            <div style={{ width: '100%', maxWidth: 320 }}>
              <p style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 18,
                fontWeight: 700,
                color: '#e8c547',
                marginBottom: 8,
                textAlign: 'center',
              }}>
                {currentPlayer.name}, enter your clue
              </p>
              <p style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#4a5068',
                marginBottom: 24,
                textAlign: 'center',
              }}>
                Is this you? Only {currentPlayer.name} should see this.
              </p>

              <input
                type="text"
                value={clueText}
                onChange={(e) => setClueText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your clue..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  color: '#e3e2e8',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 14,
                  marginBottom: 16,
                }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleSkip}
                  style={{
                    flex: 1,
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
                  SKIP
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!clueText.trim()}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
