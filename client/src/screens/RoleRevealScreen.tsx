import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../stores/roomStore';
import { useLocalGameStore } from '../stores/localGameStore';
import type { Role } from '../../../shared/types';

function hapticReveal() {
  navigator.vibrate?.([30, 10, 30]);
}

function getRoleConfig(role: Role) {
  switch (role) {
    case 'civilian':
      return {
        bg: '#0a1628',
        color: '#3ecfb0',
        label: 'CIVILIAN',
        pattern: 'radial-gradient(circle at 50% 50%, rgba(62,207,176,0.04) 1px, transparent 1px)',
        patternSize: '24px 24px',
      };
    case 'undercover':
      return {
        bg: '#1a0808',
        color: '#e84b4b',
        label: 'UNDERCOVER',
        pattern: 'radial-gradient(ellipse at 50% 80%, rgba(232,75,75,0.12) 0%, transparent 70%)',
        patternSize: '100% 100%',
      };
    case 'mr_white':
      return {
        bg: '#110a1a',
        color: '#9b6fe8',
        label: 'MR. WHITE',
        pattern: 'radial-gradient(circle at 50% 50%, rgba(155,111,232,0.04) 1px, transparent 1px)',
        patternSize: '20px 20px',
      };
    case 'detective':
      return {
        bg: '#0f1208',
        color: '#e8c547',
        label: 'DETECTIVE',
        pattern: 'radial-gradient(circle at 50% 50%, rgba(232,197,71,0.04) 1px, transparent 1px)',
        patternSize: '24px 24px',
      };
  }
}

export default function RoleRevealScreen() {
  const { myRole, myWord } = useGameStore();
  const isLocalMode = useLocalGameStore((state) => state.isLocalMode);
  const currentRevealRole = useLocalGameStore((state) => state.currentRevealRole);
  const playerReadyAfterReveal = useLocalGameStore((state) => state.playerReadyAfterReveal);

  const [isFlipped, setIsFlipped] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [showDrainBar, setShowDrainBar] = useState(false);

  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    setIsFlipped(true);
    setHasRevealed(true);
    setShowDrainBar(true);
    hapticReveal();
    autoHideTimer.current = setTimeout(() => {
      setIsFlipped(false);
    }, 5000);
  }, []);

  const peek = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setIsFlipped(true);
    hapticReveal();
    peekTimer.current = setTimeout(() => {
      setIsFlipped(false);
    }, 3000);
  }, []);

  function handleCardTap() {
    if (!isFlipped && !hasRevealed) reveal();
  }

  const handleReadyRef = useRef(handleReady);
  handleReadyRef.current = handleReady;

  const lastShakeAt = useRef(0);
  useEffect(() => {
    function handleMotion(event: DeviceMotionEvent) {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.max(
        Math.abs(acc.x ?? 0),
        Math.abs(acc.y ?? 0),
        Math.abs(acc.z ?? 0),
      );
      if (magnitude > 15) {
        const now = Date.now();
        if (now - lastShakeAt.current > 1000) {
          lastShakeAt.current = now;
          handleReadyRef.current();
        }
      }
    }

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  function handleReady() {
    if (!hasRevealed || isWaiting) return;
    setIsWaiting(true);
    if (isLocalMode) {
      playerReadyAfterReveal();
      return;
    }
    socket.emit('game:player_ready');
  }

  useEffect(() => {
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      if (peekTimer.current) clearTimeout(peekTimer.current);
    };
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    setHasRevealed(false);
    setIsWaiting(false);
    setShowDrainBar(false);
  }, [currentRevealRole?.role, currentRevealRole?.word, isLocalMode, myRole, myWord]);

  const effectiveRole = isLocalMode ? currentRevealRole?.role ?? null : myRole;
  const effectiveWord = isLocalMode ? currentRevealRole?.word ?? null : myWord;
  const wordLength = effectiveWord?.length ?? 0;
  const wordFontSize =
    wordLength > 18
      ? 'clamp(18px, 5.8vw, 28px)'
      : wordLength > 12
        ? 'clamp(21px, 6.8vw, 36px)'
        : 'clamp(24px, 8vw, 44px)';

  if (!effectiveRole) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: '#4a5068',
            letterSpacing: '0.1em',
          }}
        >
          Awaiting Role Assignment...
        </p>
      </div>
    );
  }

  const cfg = getRoleConfig(effectiveRole);
  const isMrWhite = effectiveRole === 'mr_white';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 24,
        overflowX: 'hidden',
      }}
    >
      <div
        style={{ width: '85vw', maxWidth: 340, aspectRatio: '3/4', perspective: '1000px', cursor: 'pointer' }}
        onClick={handleCardTap}
        role="button"
        aria-label="Tap to reveal your role"
        tabIndex={0}
        onKeyDown={(event) => event.key === 'Enter' && handleCardTap()}
      >
        <motion.div
          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: '#12141c',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(232,197,71,0.03) 0, rgba(232,197,71,0.03) 1px, transparent 0, transparent 50%)',
              backgroundSize: '12px 12px',
            }}
          >
            <span
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 64,
                color: 'rgba(232,197,71,0.3)',
                lineHeight: 1,
              }}
            >
              ?
            </span>
            <p
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: '#4a5068',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Tap To Reveal
            </p>
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: cfg.bg,
              borderRadius: 20,
              border: `1px solid ${cfg.color}22`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5), 0 0 40px ${cfg.color}11`,
              backgroundImage: cfg.pattern,
              backgroundSize: cfg.patternSize,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 24px 0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                alignSelf: 'flex-start',
                background: `${cfg.color}22`,
                border: `1px solid ${cfg.color}55`,
                borderRadius: 4,
                padding: '4px 10px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                fontWeight: 600,
                color: cfg.color,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {cfg.label}
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '0 8px',
              }}
            >
              {isMrWhite ? (
                <>
                  <p
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 48,
                      color: cfg.color,
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    ?
                  </p>
                  <p
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 11,
                      color: '#8c8a85',
                      textAlign: 'center',
                      letterSpacing: '0.05em',
                      margin: 0,
                    }}
                  >
                    You have no word.
                  </p>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: wordFontSize,
                      color: '#e3e2e8',
                      margin: 0,
                      lineHeight: 1.08,
                      textAlign: 'center',
                      overflowWrap: 'break-word',
                      wordBreak: 'normal',
                      width: '100%',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {effectiveWord?.toUpperCase()}
                  </p>
                  <p
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      color: '#4a5068',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      margin: 0,
                      textAlign: 'center',
                    }}
                  >
                    Remember This. Tell No One.
                  </p>
                </>
              )}
            </div>

            <div
              style={{
                height: 2,
                background: 'rgba(255,255,255,0.06)',
                margin: '0 -24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {showDrainBar && isFlipped && (
                <div
                  className="drain-bar"
                  style={{ height: '100%', background: cfg.color, position: 'absolute', left: 0, top: 0 }}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          width: '85vw',
          maxWidth: 340,
        }}
      >
        {hasRevealed && !isFlipped && !isWaiting && (
          <button
            onClick={peek}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: '#8c8a85',
              cursor: 'pointer',
              letterSpacing: '0.1em',
              padding: '8px 0',
            }}
          >
            Peek Again
          </button>
        )}

        {hasRevealed && !isWaiting && (
          <button onClick={handleReady} className="btn-primary">
            {isLocalMode ? 'Pass Device' : "I'm Ready →"}
          </button>
        )}

        {isWaiting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" style={{ background: '#3ecfb0' }} />
            <p
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#8c8a85',
                margin: 0,
                letterSpacing: '0.1em',
              }}
            >
              {isLocalMode ? 'Preparing Next Player...' : 'Waiting For Others...'}
            </p>
          </div>
        )}

        {!hasRevealed && (
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#4a5068',
              letterSpacing: '0.1em',
              textAlign: 'center',
            }}
          >
            Tap Card To Reveal Your Role Privately
          </p>
        )}
      </div>
    </div>
  );
}
