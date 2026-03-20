# Vercel Environment Variables

Set these environment variables in the Vercel dashboard under **Project → Settings → Environment Variables** for the `/client` deployment.

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (e.g. `your-project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase App ID |
| `VITE_API_BASE_URL` | No | Backend API base URL (defaults to `/api/v1`). Set to your Render service URL + `/api/v1` for production (e.g. `https://undercover-game-server.onrender.com/api/v1`) |
| `VITE_SENTRY_DSN` | No | Sentry DSN for client-side error tracking. Leave empty to disable. |

## Steps

1. Go to [vercel.com](https://vercel.com) and import the repository.
2. Set the **Root Directory** to `client`.
3. Add each environment variable listed above.
4. Deploy. The `vercel.json` in `/client` handles SPA rewrites automatically.
