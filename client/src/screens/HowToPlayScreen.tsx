import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSection {
  id: string;
  label: string;
  color: string;
  summary: string;
  details: string[];
}

const SECTIONS: HelpSection[] = [
  {
    id: 'roles',
    label: 'Roles',
    color: '#9b6fe8',
    summary: 'Three hidden roles drive the whole game.',
    details: [
      'Civilians all receive the same real word.',
      'Undercover players receive a similar but different word.',
      'Mr. White receives no word and has to deduce it from clues.',
      'An optional Detective can exist if the room enables that rule.',
    ],
  },
  {
    id: 'flow',
    label: 'Round Flow',
    color: '#e8c547',
    summary: 'Reveal, clue, discuss, vote, repeat.',
    details: [
      'Each player privately reveals their role and word.',
      'Everyone gives one clue in turn.',
      'The group debates suspicious clues during discussion.',
      'All active players vote at the same time.',
      'After elimination, the game checks whether someone has won.',
    ],
  },
  {
    id: 'winning',
    label: 'Win Conditions',
    color: '#3ecfb0',
    summary: 'Each faction is trying to end the game differently.',
    details: [
      'Civilians win when all Undercover players and Mr. White are gone.',
      'Undercover wins when their count reaches parity with civilians.',
      'Mr. White can steal the win by guessing the civilian word after elimination.',
      'Some special modes adjust role counts, but voting is still server-authoritative.',
    ],
  },
  {
    id: 'modes',
    label: 'Modes',
    color: '#60a5fa',
    summary: 'The app currently exposes the stable, playable modes.',
    details: [
      'Classic: default balanced rules.',
      'Speed Round: shorter timers and more pressure.',
      'Secret Alliance: two undercover players survive together.',
      'Double Agent: two undercover players.',
      'Reverse Mode: undercover majority.',
      'Mr. White Army: multiple Mr. Whites and no undercover.',
      'Tournament: repeated games with carried scores.',
    ],
  },
  {
    id: 'tips',
    label: 'Practical Tips',
    color: '#e84b4b',
    summary: 'Good clues feel specific without being too revealing.',
    details: [
      'If your clue is too generic, civilians may suspect you.',
      'If your clue is too exact, you may hand the answer to Mr. White.',
      'Watch late-turn players closely because they have more information.',
      'Use the clue log during discussion instead of relying on memory.',
    ],
  },
];

export default function HowToPlayScreen() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string>('roles');

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e3e2e8', padding: '20px 20px 100px' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: '#8c8a85',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 24,
          letterSpacing: '0.08em',
        }}
      >
        Back
      </button>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 6px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Field Manual
      </p>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, lineHeight: 1.05, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        How To Play
      </h1>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', margin: '0 0 24px' }}>
        Tap a section to expand it.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECTIONS.map((section, index) => {
          const open = expandedId === section.id;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              style={{
                background: '#12141c',
                border: `1px solid ${open ? `${section.color}44` : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(open ? '' : section.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: section.color, margin: '0 0 4px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {section.label}
                  </p>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8', margin: 0, lineHeight: 1.45 }}>
                    {section.summary}
                  </p>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4a5068', flexShrink: 0 }}>
                  {open ? 'HIDE' : 'SHOW'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
                        {section.details.map((detail, detailIndex) => (
                          <div key={detail} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: section.color, flexShrink: 0, marginTop: 2 }}>
                              {String(detailIndex + 1).padStart(2, '0')}
                            </span>
                            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#c8c7cc', lineHeight: 1.6, margin: 0 }}>
                              {detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{ marginTop: 24, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}
      >
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547', margin: '0 0 10px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Quick Reference
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Players', value: '3 - 12' },
            { label: 'Typical Game', value: '10 - 20 min' },
            { label: 'Phases', value: 'Reveal / Clue / Vote' },
            { label: 'Main Roles', value: '3' },
          ].map((item) => (
            <div key={item.label} style={{ background: '#1a1b20', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '0 0 3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {item.label}
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#e3e2e8', margin: 0 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
