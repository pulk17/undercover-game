import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { env } from '../env';
import GoogleSignInButton from '../components/GoogleSignInButton';
import type { TextScale, UserPreferences } from '../../../shared/types';
import { socket } from '../stores/roomStore';

type Language = 'en' | 'hi' | 'es';

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        gap: 12,
      }}
    >
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#e3e2e8' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div
      className={checked ? 'toggle-on' : 'toggle-off'}
      onClick={() => onChange(!checked)}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && onChange(!checked)}
    >
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

async function patchProfile(body: Record<string, unknown>) {
  const response = await fetch(`${env.VITE_API_BASE_URL}/profile/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: Record<string, unknown>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Failed to update profile');
  }

  return payload.data ?? {};
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);

  const [nickname, setNickname] = useState(() => user?.nickname || user?.displayName || '');
  const [textScale, setTextScale] = useState<TextScale>(
    () => user?.preferences?.textScale ?? ((localStorage.getItem('textScale') as TextScale) || 'medium'),
  );
  const [hapticsEnabled, setHapticsEnabled] = useState(
    () => user?.preferences?.hapticEnabled ?? (localStorage.getItem('hapticsEnabled') !== 'false'),
  );
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => Boolean(user?.preferences?.notifications ?? true),
  );
  const [language, setLanguage] = useState<Language>(
    () => (user?.preferences?.language as Language | undefined) ?? 'en',
  );
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-text-scale', textScale);
    localStorage.setItem('textScale', textScale);
  }, [textScale]);

  useEffect(() => {
    localStorage.setItem('hapticsEnabled', String(hapticsEnabled));
  }, [hapticsEnabled]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    setNickname(user?.nickname || user?.displayName || '');
    setTextScale(user?.preferences?.textScale ?? ((localStorage.getItem('textScale') as TextScale) || 'medium'));
    setHapticsEnabled(user?.preferences?.hapticEnabled ?? (localStorage.getItem('hapticsEnabled') !== 'false'));
    setNotificationsEnabled(Boolean(user?.preferences?.notifications ?? true));
    setLanguage((user?.preferences?.language as Language | undefined) ?? 'en');
  }, [user]);

  const canSaveProfile = useMemo(() => {
    if (!user) return false;
    return nickname.trim().length >= 1 && nickname.trim().length <= 12;
  }, [nickname, user]);

  async function handleSaveProfile() {
    if (!user || !canSaveProfile) return;

    setSaveState('saving');
    setErrorMessage('');

    try {
      const result = await patchProfile({
        displayName: nickname.trim(),
        preferences: {
          language,
          notifications: notificationsEnabled,
          hapticEnabled: hapticsEnabled,
          textScale,
        },
      });

      const nextPreferences: UserPreferences = {
        language,
        notifications: notificationsEnabled,
        hapticEnabled: hapticsEnabled,
        textScale,
      };

      setUser({
        ...user,
        displayName: (result.displayName as string | undefined) ?? nickname.trim(),
        nickname: (result.nickname as string | undefined) ?? nickname.trim(),
        preferences: nextPreferences,
      });
      socket.emit('profile:update_identity', { displayName: nickname.trim() });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1600);
    } catch (error) {
      setSaveState('error');
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e3e2e8', padding: '20px 20px 100px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: '#8c8a85',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          cursor: 'pointer',
          marginBottom: 24,
          padding: 0,
          letterSpacing: '0.1em',
        }}
      >
        Back
      </button>

      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#4a5068',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 6px',
        }}
      >
        System Config
      </p>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
        Settings
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Accessibility
          </p>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 12 }}>
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
            <SettingsRow label="Haptics">
              <Toggle checked={hapticsEnabled} onChange={setHapticsEnabled} />
            </SettingsRow>
            <SettingsRow label="Sound">
              <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
            </SettingsRow>
            <SettingsRow label="Language">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                style={{
                  background: '#0d0f17',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#e3e2e8',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                }}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
              </select>
            </SettingsRow>
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Account
          </p>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            {user ? (
              <>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 8px', letterSpacing: '0.1em' }}>
                    Change Name
                  </p>
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value.slice(0, 12))}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      height: 44,
                      background: '#0d0f17',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '0 12px',
                      fontFamily: 'Syne, sans-serif',
                      fontSize: 14,
                      color: '#e3e2e8',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4a5068', margin: '8px 0 0' }}>
                    1 to 12 characters
                  </p>
                </div>

                <SettingsRow label="Notifications">
                  <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
                </SettingsRow>

                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => void handleSaveProfile()}
                    disabled={!canSaveProfile || saveState === 'saving'}
                    className="btn-primary"
                  >
                    {saveState === 'saving' ? 'SAVING...' : saveState === 'saved' ? 'SAVED' : 'SAVE PROFILE'}
                  </button>
                  {errorMessage && (
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#e84b4b', margin: 0 }}>
                      {errorMessage}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => void logout()}
                  style={{
                    width: '100%',
                    height: 52,
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 12,
                    color: '#8c8a85',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    textAlign: 'left',
                    padding: '0 16px',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div style={{ padding: 16 }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', margin: '0 0 12px', letterSpacing: '0.1em' }}>
                  Sign in to save progress
                </p>
                <GoogleSignInButton />
              </div>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4a5068', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Help
          </p>
          <div style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              onClick={() => navigate('/how-to-play')}
              style={quickActionStyle}
            >
              How To Play
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('onboardingDone');
                navigate('/onboarding');
              }}
              style={quickActionStyle}
            >
              Replay Onboarding
            </button>
            <button
              type="button"
              onClick={() => window.open('mailto:feedback@undercover.app?subject=Undercover%20feedback', '_blank')}
              style={{ ...quickActionStyle, borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              Send Feedback
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const quickActionStyle: CSSProperties = {
  width: '100%',
  minHeight: 52,
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  color: '#e3e2e8',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
  letterSpacing: '0.08em',
  textAlign: 'left',
  padding: '0 16px',
  cursor: 'pointer',
};
