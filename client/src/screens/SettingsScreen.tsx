import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

type TextScale = 'small' | 'medium' | 'large';
const SCALE_MAP: Record<TextScale, string> = { small: '14px', medium: '16px', large: '18px' };

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 52,
      padding: '0 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={checked ? 'toggle-on' : 'toggle-off'}
      onClick={() => onChange(!checked)}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      role="switch"
      aria-checked={checked}
    >
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('highContrast') === 'true');
  const [textScale, setTextScale] = useState<TextScale>(() => (localStorage.getItem('textScale') as TextScale) || 'medium');

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('highContrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.style.fontSize = SCALE_MAP[textScale];
    localStorage.setItem('textScale', textScale);
  }, [textScale]);

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e3e2e8', padding: '20px 20px 100px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#8c8a85', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: '0.1em' }}
      >
        ← BACK
      </button>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px' }}>
        SYSTEM CONFIG
      </p>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
        SETTINGS
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Accessibility */}
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            ACCESSIBILITY
          </p>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <SettingsRow label="High Contrast">
              <Toggle checked={highContrast} onChange={setHighContrast} />
            </SettingsRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>Text Size</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['small', 'medium', 'large'] as TextScale[]).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setTextScale(scale)}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 8,
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      background: textScale === scale ? '#e8c547' : 'transparent',
                      color: textScale === scale ? '#000' : '#8c8a85',
                      border: `1px solid ${textScale === scale ? '#e8c547' : 'rgba(255,255,255,0.1)'}`,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        {user && (
          <div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              ACCOUNT
            </p>
            <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 2px', letterSpacing: '0.1em' }}>SIGNED IN AS</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8', margin: 0 }}>{user.nickname || user.displayName}</p>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  width: '100%',
                  height: 52,
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  color: '#8c8a85',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  textAlign: 'left',
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                SIGN OUT
              </button>
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            DANGER ZONE
          </p>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <button
              style={{
                width: '100%',
                height: 52,
                background: 'transparent',
                border: 'none',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#e84b4b',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                textAlign: 'left',
                padding: '0 16px',
              }}
            >
              DELETE ACCOUNT
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
