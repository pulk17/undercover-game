import { useEffect } from 'react';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';
import { env } from '../env';

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined);

// Module-level guard — survives StrictMode double-invoke
let gisInitialized = false;

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-gis-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton() {
  const { login, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || gisInitialized) return;

    loadGisScript()
      .then(() => {
        if (!window.google?.accounts?.id || gisInitialized) return;
        gisInitialized = true;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              // credential from One Tap is a JWT id_token
              const firebaseCredential = GoogleAuthProvider.credential(credential);
              const result = await signInWithCredential(auth, firebaseCredential);
              const idToken = await result.user.getIdToken();
              await login(idToken);
            } catch {
              // One Tap errors are non-fatal; user can still use the button
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.prompt();
      })
      .catch(() => {
        // GIS script failed to load — skip One Tap silently
      });
  }, [login]);

  async function handleClick() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await login(idToken);
    } catch {
      // signInWithPopup errors (e.g. popup closed) are surfaced via authStore error
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="btn-secondary"
        style={{
          background: '#fff',
          color: '#333',
          borderColor: '#e8c547',
          gap: '12px',
          fontWeight: 600,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {/* Google "G" logo SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
        {isLoading ? 'Signing in…' : 'Sign in with Google'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
