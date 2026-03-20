# Render Environment Variables

Set these environment variables in the Render dashboard under **Service → Environment** for the `/server` deployment.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` (already set in `render.yaml`) |
| `PORT` | No | Port the server listens on. Render sets this automatically. |
| `CLIENT_ORIGIN` | Yes | Allowed CORS origin — your Vercel frontend URL (e.g. `https://undercover-game.vercel.app`) |
| `JWT_SECRET` | Yes | Secret used to sign session JWTs. Use a long random string. |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase Admin SDK service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase Admin SDK private key (include the full PEM block with `\n` newlines) |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (keep secret) |
| `SENTRY_DSN` | No | Sentry DSN for server-side error tracking. Leave empty to disable. |

## Steps

1. Go to [render.com](https://render.com) and create a new **Web Service**.
2. Connect your repository and set the **Root Directory** to `server`.
3. Render will detect `render.yaml` automatically. Review the settings.
4. Add each environment variable listed above in the **Environment** tab.
5. Deploy. The health check at `/api/v1/health` will be used by Render to verify the service is up.
