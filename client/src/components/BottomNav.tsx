import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  {
    id: 'lobby',
    label: 'LOBBY',
    path: '/lobby',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8c547' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'rules',
    label: 'RULES',
    path: '/how-to-play',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8c547' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'RANK',
    path: '/leaderboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8c547' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    id: 'config',
    label: 'CONFIG',
    path: '/settings',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8c547' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

// Routes where the bottom nav should be hidden
const HIDDEN_ON_EXACT = ['/create', '/join', '/onboarding'];
const HIDDEN_ON_PREFIX = ['/game/', '/join/'];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const hide = HIDDEN_ON_EXACT.includes(location.pathname) ||
    HIDDEN_ON_PREFIX.some((p) => location.pathname.startsWith(p));
  if (hide) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 14px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          minHeight: 72,
          background: 'rgba(18,20,28,0.94)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          boxShadow: '0 16px 40px rgba(0,0,0,0.38)',
          backdropFilter: 'blur(18px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          pointerEvents: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const active =
            location.pathname === tab.path ||
            (tab.path === '/lobby' && location.pathname === '/') ||
            (tab.path === '/settings' &&
              (location.pathname === '/settings' || location.pathname === '/profile'));

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 16px',
                borderRadius: 14,
                background: active ? 'rgba(232,197,71,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 150ms ease',
                minWidth: 68,
              }}
            >
              {tab.icon(active)}
              <span
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  color: active ? '#e8c547' : 'rgba(255,255,255,0.4)',
                  transition: 'color 150ms ease',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
