import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Section {
  id: string;
  icon: string;
  label: string;
  color: string;
  summary: string;
  details: string[];
  tip?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'overview',
    icon: '◎',
    label: 'OVERVIEW',
    color: '#e8c547',
    summary: 'A social deduction game for 3–12 players. Find the impostors before they outnumber you.',
    details: [
      'Each round, players are secretly assigned one of three roles: Civilian, Undercover, or Mr. White.',
      'Civilians all share the same secret word. Undercover agents receive a similar but different word. Mr. White gets no word at all.',
      'The game proceeds through Clue → Discussion → Vote phases until one side wins.',
      'Civilians win by eliminating all Undercover agents. Undercover wins if they equal or outnumber Civilians.',
    ],
    tip: 'Best played with 5–8 players for the most balanced experience.',
  },
  {
    id: 'roles',
    icon: '👤',
    label: 'ROLES',
    color: '#9b6fe8',
    summary: 'Three roles, three strategies. Know your role, play it smart.',
    details: [
      '🟡 CIVILIAN — You know the real word. Give clues that prove you know it without making it too obvious. Vote out the impostors.',
      '🔴 UNDERCOVER — You have a related but different word. Blend in with the Civilians. Give plausible clues without revealing your word is different.',
      '⬜ MR. WHITE — You have no word. Listen carefully to everyone\'s clues to deduce the Civilian word. If eliminated, you get one guess to steal the win.',
      '🔵 DETECTIVE (optional) — One Civilian is secretly the Detective. They can make a mid-game accusation. Correct = instant win. Wrong = eliminated.',
    ],
    tip: 'As Undercover, your word is always related to the Civilian word — use that connection.',
  },
  {
    id: 'clue',
    icon: '💬',
    label: 'CLUE PHASE',
    color: '#3ecfb0',
    summary: 'Each player gives exactly one word as a clue. No sentences, no gestures.',
    details: [
      'Players take turns giving a single-word clue about their secret word.',
      'The clue must be one word only — no phrases, no explanations, no hesitation tells.',
      'Civilians: be descriptive enough that other Civilians trust you, but subtle enough that Undercover can\'t copy you.',
      'Undercover: your clue must fit both your word AND the Civilian word plausibly. Too specific = exposed.',
      'Mr. White: listen to all clues carefully. Try to give a vague clue that could fit whatever the real word is.',
      'If a timer is set, you must give your clue before time runs out or you\'re skipped.',
    ],
    tip: 'Avoid clues that are too generic ("nice", "good") — they look suspicious from Civilians.',
  },
  {
    id: 'discussion',
    icon: '🗣',
    label: 'DISCUSSION',
    color: '#e8c547',
    summary: 'Open debate. Accuse, defend, and read between the lines.',
    details: [
      'After all clues are given, players discuss openly who they think the Undercover agent is.',
      'Point out suspicious clues, ask follow-up questions, and defend your own clue if challenged.',
      'Civilians: look for clues that are slightly off — too vague, too specific, or inconsistent with the word.',
      'Undercover: deflect suspicion onto others. Agree with Civilian reasoning to appear trustworthy.',
      'Mr. White: stay quiet and observe. The less you say, the less you reveal.',
      'Discussion ends when the host advances to the vote, or when the discussion timer expires.',
    ],
    tip: 'Watch for players who change their story or avoid committing to an accusation.',
  },
  {
    id: 'voting',
    icon: '🗳',
    label: 'VOTING',
    color: '#e84b4b',
    summary: 'Vote to eliminate. The player with the most votes is out.',
    details: [
      'Each player votes for who they think is Undercover (you cannot vote for yourself).',
      'The player with the most votes is eliminated. Ties are resolved based on the host\'s tie-break setting (re-vote or random).',
      'If "Reveal Role After Elimination" is on, the eliminated player\'s role is shown to everyone.',
      'If the eliminated player is Mr. White, they immediately get one chance to guess the Civilian word.',
      'If Mr. White guesses correctly, Undercover wins. If wrong, the game continues.',
      'After elimination, the game checks win conditions before starting the next round.',
    ],
    tip: 'Don\'t always vote with the majority — sometimes the crowd is being manipulated.',
  },
  {
    id: 'winning',
    icon: '🏆',
    label: 'WIN CONDITIONS',
    color: '#3ecfb0',
    summary: 'The game ends when one side achieves their objective.',
    details: [
      '✅ CIVILIANS WIN — All Undercover agents and Mr. White are eliminated.',
      '✅ UNDERCOVER WINS — Undercover agents equal or outnumber the remaining Civilians.',
      '✅ MR. WHITE WINS — Mr. White is eliminated but correctly guesses the Civilian word.',
      '✅ DETECTIVE WINS — The Detective correctly accuses an Undercover agent mid-game.',
      'The game can end mid-round if a win condition is met after any elimination.',
    ],
    tip: 'Undercover doesn\'t need to eliminate everyone — just survive long enough to reach parity.',
  },
  {
    id: 'mrwhite',
    icon: '⬜',
    label: 'MR. WHITE',
    color: '#8c8a85',
    summary: 'No word, no clues — just your wits and everyone else\'s slips.',
    details: [
      'Mr. White starts with no word at all. Their entire strategy is deduction.',
      'During the Clue Phase, listen to every clue carefully. The Civilian word will emerge from the pattern.',
      'Give vague, universal clues that could apply to almost anything ("warm", "common", "natural").',
      'If you\'re eliminated, you get one final guess at the Civilian word. A correct guess wins the game for Undercover.',
      'Even if you guess wrong, you\'ve forced Civilians to reveal the word — use that information if you survive.',
    ],
    tip: 'Mr. White is the hardest role. Focus on listening, not talking.',
  },
  {
    id: 'modes',
    icon: '⚡',
    label: 'GAME MODES',
    color: '#e8c547',
    summary: 'Four modes to change up the pace and challenge.',
    details: [
      '◎ CLASSIC — Standard rules. Full clue and discussion timers. Best for new players.',
      '⚡ SPEED ROUND — Shorter timers force quick thinking. No time to overthink your clue.',
      '◈ DOUBLE AGENT — Two Undercover agents instead of one. Harder for Civilians, easier for Undercover to coordinate.',
      '↺ REVERSE MODE — Undercover knows the Civilian word. Civilians must figure out who knows too much.',
    ],
    tip: 'Try Classic first, then experiment with Speed Round once everyone knows the rules.',
  },
  {
    id: 'tips',
    icon: '🎯',
    label: 'PRO TIPS',
    color: '#9b6fe8',
    summary: 'Strategies that separate good players from great ones.',
    details: [
      '🎯 As Civilian: give clues that are specific enough to prove knowledge but not so obvious they hand-hold Undercover.',
      '🎯 As Undercover: your word is always related — lean into that relationship. If Civilians say "ocean", you might have "sea".',
      '🎯 Watch clue order: players who go later have more information. Suspicious clues from late-order players are more damning.',
      '🎯 Silence is suspicious. Players who give very short clues or seem hesitant are often hiding something.',
      '🎯 Don\'t tunnel-vision on one suspect. Undercover players often let others take the heat.',
      '🎯 In Double Agent mode, Undercover agents can subtly coordinate by mirroring each other\'s clue style.',
    ],
  },
];

export default function HowToPlayScreen() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>('overview');

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
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        HOW TO PLAY
      </h1>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4a5068', margin: '0 0 28px' }}>
        Tap any section to expand
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECTIONS.map((section, idx) => {
          const isOpen = expanded === section.id;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              style={{
                background: '#12141c',
                border: `1px solid ${isOpen ? section.color + '44' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'border-color 200ms ease',
              }}
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : section.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{section.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: section.color, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2px' }}>
                    {section.label}
                  </p>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#e3e2e8', margin: 0, lineHeight: 1.4 }}>
                    {section.summary}
                  </p>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#4a5068', flexShrink: 0, transition: 'transform 200ms ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▾
                </span>
              </button>

              {/* Expanded content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
                        {section.details.map((detail, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: section.color, flexShrink: 0, marginTop: 2 }}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#c8c7cc', margin: 0, lineHeight: 1.6 }}>
                              {detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      {section.tip && (
                        <div style={{
                          marginTop: 14,
                          padding: '10px 12px',
                          background: `${section.color}0d`,
                          border: `1px solid ${section.color}33`,
                          borderRadius: 10,
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: section.color, margin: 0, lineHeight: 1.5 }}>
                            {section.tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Quick reference card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.25 }}
        style={{ marginTop: 24, background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}
      >
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e8c547', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          QUICK REFERENCE
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Players', value: '3 – 12' },
            { label: 'Avg. Game', value: '10 – 20 min' },
            { label: 'Phases', value: 'Clue → Vote' },
            { label: 'Roles', value: '3 types' },
          ].map((item) => (
            <div key={item.label} style={{ background: '#1a1b20', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>
                {item.label}
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e3e2e8', margin: 0 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
