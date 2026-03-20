import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuthStore } from '../stores/authStore';

const SLIDES = [
  {
    id: 'roles',
    eyebrow: 'Know The Roles',
    title: 'Three Hidden Identities',
    body: [
      'Civilians share the same real word.',
      'Undercover players receive a similar but different word.',
      'Mr. White receives no word and survives by deduction.',
    ],
    accent: '#9b6fe8',
  },
  {
    id: 'flow',
    eyebrow: 'How A Round Works',
    title: 'Reveal, Clue, Discuss, Vote',
    body: [
      'Each player privately reveals their role and word.',
      'Everyone gives one clue in turn.',
      'The room debates suspicious clues.',
      'Everyone votes together and the game advances from the result.',
    ],
    accent: '#e8c547',
  },
  {
    id: 'tips',
    eyebrow: 'Play Smart',
    title: 'Helpful Starting Tips',
    body: [
      'Too vague can look suspicious.',
      'Too specific can help Mr. White.',
      'Watch late-turn players closely because they have more context.',
    ],
    accent: '#3ecfb0',
  },
];

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { user, loginAsGuest, isLoading } = useAuthStore();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function finish() {
    localStorage.setItem('onboardingDone', 'true');
    navigate('/lobby', { replace: true });
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }

    setDirection(1);
    setIndex((value) => value + 1);
  }

  function previous() {
    if (index === 0) return;
    setDirection(-1);
    setIndex((value) => value - 1);
  }

  async function handleGuestPlay() {
    await loginAsGuest();
    finish();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: '20px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: slide.accent, opacity: 0.06, filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -40, width: 180, height: 180, borderRadius: '50%', background: '#e84b4b', opacity: 0.05, filter: 'blur(70px)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#e3e2e8', margin: 0, letterSpacing: '-0.02em' }}>
          UNDERCOVER
        </h1>
        <button
          type="button"
          onClick={finish}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a5068',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 18, position: 'relative', zIndex: 1 }}>
        {SLIDES.map((entry, slideIndex) => (
          <div
            key={entry.id}
            style={{
              flex: slideIndex === index ? 2 : 1,
              height: 3,
              borderRadius: 999,
              background: slideIndex <= index ? slide.accent : 'rgba(255,255,255,0.12)',
              transition: 'all 220ms ease',
            }}
          />
        ))}
      </div>

      <div style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {slide.eyebrow}
        </p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(26px, 7vw, 30px)', lineHeight: 1.05, color: '#e3e2e8', margin: 0, letterSpacing: '-0.03em' }}>
          {slide.title}
        </h2>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1, minHeight: 260 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%' }}
          >
            <div style={{ background: '#12141c', border: `1px solid ${slide.accent}33`, borderRadius: 20, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
              {slide.body.map((line, lineIndex) => (
                <div key={line} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: slide.accent, marginTop: 2, flexShrink: 0 }}>
                    {String(lineIndex + 1).padStart(2, '0')}
                  </span>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, lineHeight: 1.6, color: '#e3e2e8', margin: 0 }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {isLast && !user && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: 12 }}>
            <GoogleSignInButton />
          </motion.div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {index > 0 && (
            <button type="button" onClick={previous} className="btn-secondary" style={{ flex: 1 }}>
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast && !user ? () => void handleGuestPlay() : next}
            className="btn-primary"
            style={{ flex: index > 0 ? 2 : 1 }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : isLast ? (user ? 'Start Playing' : 'Play As Guest') : 'Next'}
          </button>
        </div>

        {isLast && !user && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '10px 0 0', textAlign: 'center', lineHeight: 1.6 }}>
            Google sign-in saves your identity and progress. Guest mode is always available.
          </p>
        )}
      </div>
    </div>
  );
}
