import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuthStore } from '../stores/authStore';

// ─── Slide 1: Role cards ──────────────────────────────────────────────────────

function RoleCard({
  label, word, color, bg, delay, desc,
}: {
  label: string; word: string; color: string; bg: string; delay: number; desc: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      style={{
        flex: 1,
        background: bg,
        border: `1px solid ${color}30`,
        borderRadius: 18,
        padding: '18px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: `0 0 32px ${color}0d, inset 0 1px 0 rgba(255,255,255,0.06)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: color,
        opacity: 0.07,
        filter: 'blur(24px)',
        pointerEvents: 'none',
      }} />

      {/* Role badge */}
      <div style={{
        alignSelf: 'flex-start',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: '3px 8px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 8,
        color,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      {/* Word */}
      <p style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: 20,
        color: '#e3e2e8',
        margin: 0,
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        {word}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: `${color}20` }} />

      {/* Description */}
      <p style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10,
        color: '#8c8a85',
        margin: 0,
        lineHeight: 1.6,
      }}>
        {desc}
      </p>
    </motion.div>
  );
}

const Slide1 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
    <div style={{ display: 'flex', gap: 10 }}>
      <RoleCard
        label="Civilian"
        word="COFFEE"
        color="#3ecfb0"
        bg="rgba(62,207,176,0.05)"
        delay={0.05}
        desc="You know the real word. Find the spy."
      />
      <RoleCard
        label="Undercover"
        word="TEA"
        color="#e84b4b"
        bg="rgba(232,75,75,0.05)"
        delay={0.12}
        desc="Similar word. Blend in. Don't get caught."
      />
    </div>
    <RoleCard
      label="Mr. White"
      word="???"
      color="#9b6fe8"
      bg="rgba(155,111,232,0.05)"
      delay={0.19}
      desc="No word at all. Listen carefully. Guess right when eliminated to steal the win."
    />
  </div>
);

// ─── Slide 2: Game flow ───────────────────────────────────────────────────────

function PhaseRow({ num, icon, label, desc, color, delay }: {
  num: number; icon: string; label: string; desc: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `${color}12`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            color: color,
            letterSpacing: '0.1em',
          }}>
            {String(num).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            color: '#e3e2e8',
            letterSpacing: '-0.01em',
          }}>
            {label}
          </span>
        </div>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#8c8a85',
          margin: 0,
          lineHeight: 1.55,
        }}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

const PHASES = [
  { icon: '👁', label: 'Role Reveal', desc: 'Each player secretly views their role and word — pass the phone.', color: '#9b6fe8' },
  { icon: '💬', label: 'Clue Phase', desc: 'One word each. Prove you know without giving it away.', color: '#3ecfb0' },
  { icon: '🗣', label: 'Discussion', desc: 'Debate, accuse, and defend. Read between the lines.', color: '#e8c547' },
  { icon: '🗳', label: 'Vote', desc: 'Eliminate the player you suspect. Most votes is out.', color: '#e84b4b' },
  { icon: '🏆', label: 'Win Condition', desc: 'Civilians eliminate all spies — or Undercover reaches parity.', color: '#3ecfb0' },
];

const Slide2 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
    {PHASES.map((p, i) => (
      <PhaseRow key={p.label} num={i + 1} icon={p.icon} label={p.label} desc={p.desc} color={p.color} delay={i * 0.07} />
    ))}
  </div>
);

// ─── Slide 3: Tips + auth ─────────────────────────────────────────────────────

const TIPS = [
  { icon: '🎯', text: 'Too generic = suspicious Civilian. Too specific = exposed Undercover.' },
  { icon: '👂', text: 'Mr. White has no word — listen to everyone\'s clues to deduce it.' },
  { icon: '⚡', text: 'Watch clue order. Late players have more info — their slips are more telling.' },
];

const Slide3 = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
    {/* Quote card */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.3 }}
      style={{
        background: 'rgba(232,197,71,0.06)',
        border: '1px solid rgba(232,197,71,0.2)',
        borderRadius: 16,
        padding: '18px 20px',
      }}
    >
      <p style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: 16,
        color: '#e8c547',
        margin: 0,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      }}>
        "Be specific enough to prove you know. Be vague enough to protect it."
      </p>
    </motion.div>

    {/* Tips */}
    {TIPS.map((tip, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + i * 0.07, duration: 0.3 }}
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          background: '#12141c',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{tip.icon}</span>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#c8c7cc',
          margin: 0,
          lineHeight: 1.6,
        }}>
          {tip.text}
        </p>
      </motion.div>
    ))}
  </div>
);

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'roles',
    eyebrow: 'KNOW YOUR IDENTITY',
    title: 'Three Roles',
    content: <Slide1 />,
  },
  {
    id: 'flow',
    eyebrow: 'FIVE PHASES',
    title: 'How It Works',
    content: <Slide2 />,
  },
  {
    id: 'tips',
    eyebrow: 'FIELD MANUAL',
    title: 'Play Smart',
    content: <Slide3 />,
  },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

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
    if (index < SLIDES.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    } else {
      done();
    }
  }

  function prev() {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }

  async function handleGuest() {
    await loginAsGuest();
    done();
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background atmosphere */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 260, height: 260, borderRadius: '50%', background: '#e8c547', opacity: 0.04, filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 220, height: 220, borderRadius: '50%', background: '#3ecfb0', opacity: 0.04, filter: 'blur(80px)' }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px 0',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 18,
          color: '#e3e2e8',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          UNDERCOVER
        </h1>

        <button
          onClick={done}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: '#4a5068',
            cursor: 'pointer',
            padding: '4px 0',
            letterSpacing: '0.08em',
          }}
        >
          SKIP
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                flex: i === index ? 2 : 1,
                height: 3,
                borderRadius: 2,
                background: i <= index ? '#e8c547' : 'rgba(255,255,255,0.1)',
                transition: 'all 400ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Slide header */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`header-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#4a5068',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 6px',
            }}>
              {slide.eyebrow}
            </p>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 30,
              color: '#e3e2e8',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {slide.title}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide content — scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px 0',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
      }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`content-${index}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -32 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        {/* Google sign-in on last slide */}
        {isLast && !user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.25 }}
            style={{ marginBottom: 12 }}
          >
            <GoogleSignInButton />
          </motion.div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {index > 0 && (
            <button
              onClick={prev}
              className="btn-secondary"
              style={{ flex: 1, height: 52 }}
            >
              ← BACK
            </button>
          )}
          <button
            onClick={isLast && !user ? handleGuest : next}
            className="btn-primary"
            style={{ flex: index > 0 ? 2 : 1, height: 52 }}
            disabled={isLoading}
          >
            {isLoading
              ? 'LOADING…'
              : isLast
                ? user ? 'START PLAYING →' : 'PLAY AS GUEST →'
                : 'NEXT →'}
          </button>
        </div>

        {isLast && !user && (
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            color: '#4a5068',
            textAlign: 'center',
            margin: '10px 0 0',
            letterSpacing: '0.06em',
            lineHeight: 1.6,
          }}>
            Sign in to save XP & stats · Guest mode is always available
          </p>
        )}
      </div>
    </div>
  );
}
