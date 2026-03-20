import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RULES = [
  { label: 'PLAYERS', body: '3–12 players. One or more are Undercover agents with a similar but different secret word.' },
  { label: 'ROLES', body: 'Civilians share the same word. Undercover gets a related word. Mr. White gets no word at all.' },
  { label: 'CLUE PHASE', body: 'Each player gives a one-word clue about their word. Be descriptive enough for teammates, subtle enough to fool others.' },
  { label: 'DISCUSSION', body: 'Discuss who you think the Undercover agent is. Civilians must find the impostor. Undercover must blend in.' },
  { label: 'VOTING', body: 'Vote to eliminate a player. The player with the most votes is eliminated and their role is revealed.' },
  { label: 'WINNING', body: 'Civilians win by eliminating all Undercover agents. Undercover wins if they equal or outnumber Civilians.' },
  { label: 'MR. WHITE', body: 'Mr. White has no word. If eliminated, they get one chance to guess the civilian word and steal the win.' },
  { label: 'DETECTIVE', body: 'One Civilian is secretly the Detective. They can accuse a player mid-game — correct = win, wrong = eliminated.' },
];

export default function HowToPlayScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e3e2e8', padding: '20px 20px 100px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#8c8a85', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: '0.1em' }}
      >
        ← BACK
      </button>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px' }}>
        FIELD MANUAL
      </p>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
        HOW TO PLAY
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {RULES.map((rule, idx) => (
          <motion.div
            key={rule.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.25 }}
            style={{
              background: '#12141c',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '16px 18px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              {rule.label}
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8c8a85', margin: 0, lineHeight: 1.6 }}>
              {rule.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
