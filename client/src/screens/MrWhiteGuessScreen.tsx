import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useLocalGameStore } from '../stores/localGameStore';
import { socket } from '../stores/roomStore';

function useCountdown(endsAt: number | null): number {
  const [secs, setSecs] = useState<number>(() =>
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (endsAt === null) {
      setSecs(0);
      return;
    }

    const targetEndsAt = endsAt;
    function tick() {
      setSecs(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
    }

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  return secs;
}

export default function MrWhiteGuessScreen() {
  const myRole = useGameStore((state) => state.myRole);
  const onlineGameState = useGameStore((state) => state.gameState);
  const isLocalMode = useLocalGameStore((state) => state.isLocalMode);
  const localGameState = useLocalGameStore((state) => state.gameState);
  const submitLocalGuess = useLocalGameStore((state) => state.submitMrWhiteGuess);

  const [guessWindowOpened, setGuessWindowOpened] = useState(false);
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const gameState = isLocalMode ? localGameState : onlineGameState;
  const endsAt = isLocalMode ? null : onlineGameState?.phaseEndsAt ?? null;
  const secsLeft = useCountdown(endsAt);
  const timerRed = secsLeft > 0 && secsLeft <= 5;

  useEffect(() => {
    if (isLocalMode) return;

    function onMrWhiteWindow() {
      setGuessWindowOpened(true);
      setSubmitted(false);
      setGuess('');
    }

    socket.on('game:mr_white_window', onMrWhiteWindow);
    return () => {
      socket.off('game:mr_white_window', onMrWhiteWindow);
    };
  }, [isLocalMode]);

  useEffect(() => {
    if (gameState?.phase !== 'mr_white_guess') {
      setGuessWindowOpened(false);
      setSubmitted(false);
      setGuess('');
    }
  }, [gameState?.phase]);

  const isOnlineMrWhiteTurn = useMemo(() => {
    if (isLocalMode || !gameState) return false;
    if (myRole !== 'mr_white') return false;

    const myId = socket.id;
    if (!myId) return false;

    return gameState.spectators.includes(myId) || gameState.activePlayers.includes(myId);
  }, [gameState, isLocalMode, myRole]);

  const isMrWhite = isLocalMode ? true : guessWindowOpened || isOnlineMrWhiteTurn;

  function handleSubmit() {
    const trimmed = guess.trim();
    if (submitted || trimmed === '') return;

    setSubmitted(true);
    if (isLocalMode) {
      submitLocalGuess(trimmed);
      return;
    }

    socket.emit('game:mr_white_guess', { guess: trimmed });
  }

  if (isMrWhite) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08090d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          gap: 24,
          overflowX: 'hidden',
        }}
      >
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#9b6fe8',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Mr. White
          </p>
          <h1
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(24px, 8vw, 28px)',
              color: '#e3e2e8',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
              overflowWrap: 'anywhere',
            }}
          >
            Final Guess
          </h1>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#8c8a85',
              margin: 0,
              maxWidth: 320,
              lineHeight: 1.6,
              overflowWrap: 'anywhere',
            }}
          >
            {isLocalMode
              ? 'Type the civilian word. A correct guess steals the win.'
              : 'You have one last chance. Guess the civilians word to win.'}
          </p>
        </motion.div>

        {!isLocalMode && (
          <motion.span
            animate={timerRed ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 'clamp(40px, 16vw, 56px)',
              fontWeight: 600,
              color: timerRed ? '#e84b4b' : '#9b6fe8',
              letterSpacing: '0.05em',
            }}
          >
            {secsLeft}s
          </motion.span>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            width: '100%',
            maxWidth: 340,
            background: '#12141c',
            border: '1px solid rgba(155,111,232,0.2)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="text"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
            disabled={submitted || (!isLocalMode && secsLeft === 0)}
            placeholder="Enter your guess..."
            maxLength={40}
            style={{
              width: '100%',
              height: 48,
              background: '#08090d',
              border: '1px solid rgba(155,111,232,0.3)',
              borderRadius: 10,
              padding: '0 16px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 14,
              color: '#e3e2e8',
              outline: 'none',
              boxSizing: 'border-box',
              opacity: submitted || (!isLocalMode && secsLeft === 0) ? 0.4 : 1,
            }}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = '#9b6fe8';
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = 'rgba(155,111,232,0.3)';
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={submitted || guess.trim() === '' || (!isLocalMode && secsLeft === 0)}
            style={{
              height: 48,
              background: submitted ? 'rgba(155,111,232,0.2)' : '#9b6fe8',
              border: 'none',
              borderRadius: 10,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 14,
              color: submitted ? '#9b6fe8' : '#fff',
              cursor: submitted || guess.trim() === '' || (!isLocalMode && secsLeft === 0) ? 'not-allowed' : 'pointer',
              opacity: submitted || guess.trim() === '' || (!isLocalMode && secsLeft === 0) ? 0.5 : 1,
              letterSpacing: '0.05em',
              transition: 'all 150ms ease',
            }}
          >
            {submitted ? 'GUESS SUBMITTED' : 'SUBMIT GUESS'}
          </button>
        </motion.div>

        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" style={{ background: '#9b6fe8' }} />
            <p
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#8c8a85',
                margin: 0,
                letterSpacing: '0.1em',
              }}
            >
              Awaiting Result...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 24,
        overflowX: 'hidden',
      }}
    >
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#e8c547',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          Final Guess
        </p>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(24px, 8vw, 28px)',
            color: '#e3e2e8',
            margin: 0,
            overflowWrap: 'anywhere',
            textAlign: 'center',
          }}
        >
          Mr. White Is Guessing
        </h1>
      </motion.div>

      {endsAt !== null && (
        <motion.span
          animate={timerRed ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.6, repeat: Infinity }}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 'clamp(40px, 16vw, 56px)',
            fontWeight: 600,
            color: timerRed ? '#e84b4b' : '#9b6fe8',
          }}
        >
          {secsLeft}s
        </motion.span>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: '#12141c',
          border: '1px solid rgba(155,111,232,0.2)',
          borderRadius: 14,
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          maxWidth: 320,
        }}
      >
        <div className="pulse-dot" style={{ background: '#9b6fe8' }} />
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: '#8c8a85',
            margin: 0,
            letterSpacing: '0.08em',
            textAlign: 'center',
            overflowWrap: 'anywhere',
          }}
        >
          Waiting for Mr. White answer
        </p>
      </motion.div>
    </div>
  );
}
