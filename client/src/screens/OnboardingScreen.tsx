import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuthStore } from '../stores/authStore';

// Mini role card for slide 1
function MiniRoleCard({ role, word, color, bg, label }: { role: string; word: string; color: string; bg: string; label: string }) {
  return (
    <div style={{
      width: 90,
      aspectRatio: '3/4',
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 10px 0',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px ${color}11`,
      overflow: 'hidden',
    }}>
      <div style={{
        background: `${color}22`,
        border: `1px solid ${color}55`,
        borderRadius: 3,
        padding: '2px 6px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 7,
        color,
        letterSpacing: '0.1em',
        alignSelf: 'flex-start',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#e3e2e8', margin: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {word}
        </p>
      </div>
      <div style={{ height: 2, background: `${color}44`, margin: '0 -10px' }} />
    </div>
  );
}

// Flow step for slide 2
function FlowStep({ num, label, desc }: { num: number; label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: 'rgba(232,197,71,0.12)',
        border: '1px solid rgba(232,197,71,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11,
        fontWeight: 600,
        color: '#e8c547',
        flexShrink: 0,
      }}>
        {num}
      </div>
      <div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#e3e2e8', margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8c8a85', margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    id: 'roles',
    title: 'THREE ROLES',
    subtitle: 'Know your identity',
    content: (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '8px 0' }}>
        <MiniRoleCard role="civilian" word="COFFEE" color="#3ecfb0" bg="#0a1628" label="CIVILIAN" />
        <MiniRoleCard role="undercover" word="TEA" color="#e84b4b" bg="#1a0808" label="UNDERCOVER" />
        <MiniRoleCard role="mr_white" word="?" color="#9b6fe8" bg="#110a1a" label="MR. WHITE" />
      </div>
    ),
  },
  {
    id: 'flow',
    title: 'HOW IT WORKS',
    subtitle: 'Five phases, one winner',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
        <FlowStep num={1} label="Role Reveal" desc="Each player secretly views their role and word." />
        <FlowStep num={2} label="Clue Phase" desc="Give one-word clues about your word in turn." />
        <FlowStep num={3} label="Discussion" desc="Debate who the spy might be." />
        <FlowStep num={4} label="Vote" desc="Vote to eliminate the suspected undercover agent." />
        <FlowStep num={5} label="Elimination" desc="Role revealed. Game continues until a faction wins." />
      </div>
    ),
  },
  {
    id: 'tips',
    title: 'FIELD MANUAL',
    subtitle: 'Survive the interrogation',
    content: (
      <div style={{
        background: '#12141c',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '20px 20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        maxWidth: 300,
        width: '100%',
      }}>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          color: '#e8c547',
          lineHeight: 1.7,
          margin: '0 0 16px',
          fontStyle: 'italic',
        }}>
          "Be specific enough to prove you know. Be vague enough to protect it."
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Watch for clues that are too generic — or too specific.',
            'Mr. White has no word. Bluff with confidence.',
            'Civilians: find the spy before they outnumber you.',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: '#4a5068', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, flexShrink: 0, marginTop: 1 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: 0, lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const { user, loginAsGuest, isLoading } = useAuthStore();

  function done() {
    localStorage.setItem('onboardingDone', 'true');
    navigate('/lobby', { replace: true });
  }

  function next() {
    if (index < SLIDES.length - 1) { setDirection(1); setIndex((i) => i + 1); }
    else done();
  }

  function prev() {
    if (index > 0) { setDirection(-1); setIndex((i) => i - 1); }
  }

  const slide = SLIDES[index];
  const isLastSlide = index === SLIDES.length - 1;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px 40px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: '#e3e2e8', letterSpacing: '-0.03em', margin: 0 }}>
          UNDERCOVER
        </h1>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              width: i === index ? 24 : 8,
              borderRadius: 2,
              background: i === index ? '#e8c547' : 'rgba(255,255,255,0.15)',
              transition: 'all 300ms ease',
            }}
          />
        ))}
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                {slide.subtitle}
              </p>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#e3e2e8', margin: 0, letterSpacing: '-0.01em' }}>
                {slide.title}
              </h2>
            </div>
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 32 }}>
        {/* Google SSO on last slide */}
        {isLastSlide && !user && (
          <div style={{ marginBottom: 4 }}>
            <GoogleSignInButton />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {index > 0 && (
            <button
              onClick={prev}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              BACK
            </button>
          )}
          <button
            onClick={next}
            className="btn-primary"
            style={{ flex: 2 }}
            disabled={isLoading}
          >
            {isLastSlide ? (user ? 'START PLAYING →' : 'PLAY AS GUEST →') : 'NEXT →'}
          </button>
        </div>

        {isLastSlide && !user && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', textAlign: 'center', margin: 0, letterSpacing: '0.08em' }}>
            Sign in to save progress · Guest mode available without account
          </p>
        )}
      </div>
    </div>
  );
}
