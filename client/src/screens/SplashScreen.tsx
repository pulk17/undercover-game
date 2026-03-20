import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import GoogleSignInButton from '../components/GoogleSignInButton';

// The SplashScreen doubles as the Home/Landing screen when onboarding is done.
// It shows the UNDERCOVER logo, CTA buttons, and a player footer.

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Restore session from cookie if one exists, then connect socket
    fetchMe().finally(() => {
      const t = setTimeout(onDone, 1200);
      return () => clearTimeout(t);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = user?.nickname
    ? user.nickname.slice(0, 2).toUpperCase()
    : user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : 'PK';

  const levelLabel = user?.level ? `Lv.${user.level}` : '';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '0 24px',
      }}
    >
      {/* Atmospheric blurred circles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 300, height: 300, borderRadius: '50%', background: '#3ecfb0', opacity: 0.08, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: '#e84b4b', opacity: 0.08, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: 240, height: 240, borderRadius: '50%', background: '#9b6fe8', opacity: 0.07, filter: 'blur(100px)' }} />
      </div>

      {/* Dot grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(232,197,71,0.08) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* Logo block */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 48 }}
      >
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 40,
          color: '#e3e2e8',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          UNDERCOVER
        </h1>
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.3)' }} />
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: '#4a5068',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          WHO IS THE SPY?
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}
      >
        <button
          className="btn-primary"
          onClick={() => { onDone(); navigate('/create'); }}
        >
          CREATE ROOM
        </button>
        <button
          className="btn-secondary"
          onClick={() => { onDone(); navigate('/join'); }}
        >
          JOIN ROOM
        </button>
        <button
          onClick={() => { onDone(); navigate('/how-to-play'); }}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: '#4a5068',
            cursor: 'pointer',
            padding: '12px 0',
            letterSpacing: '0.1em',
          }}
        >
          HOW TO PLAY
        </button>

        {/* Sign in prompt for unauthenticated users */}
        {!user && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <GoogleSignInButton />
          </div>
        )}
      </motion.div>

      {/* Player footer */}
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(232,197,71,0.15)',
            border: '1px solid rgba(232,197,71,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            color: '#e8c547',
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#8c8a85', margin: 0 }}>
              {user.nickname || user.displayName}
              {levelLabel && <span style={{ color: '#4a5068', marginLeft: 6 }}>· {levelLabel}</span>}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
