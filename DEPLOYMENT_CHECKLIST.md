# Deployment Checklist - COMPLETE THIS IN ORDER

## 1. Render Backend Setup

### Environment Variables (Set in Render Dashboard)
Go to: https://dashboard.render.com/ → Your Service → Environment

```
PORT=3001
NODE_ENV=production
CLIENT_ORIGIN=https://undercover-game-client.vercel.app,https://undercover-game-client-2jhj.vercel.app
JWT_SECRET=b3bb2a2313ced7590d67957e7e3c8a2d75e3fe2a16b167a99dbdfaa54c069481aca926f1ebe2a9342aaef26a028005d458d869ab9873ccb19190d52dea15c7eb
FIREBASE_PROJECT_ID=undercover-game-883a6
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@undercover-game-883a6.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDEdIHYwRwql6Ew\nHCtAuX1GLyP3aUeJsfjNMKpJUPhTai0m/k8yqZ3T4tWAalROQbIVYVlvl30pVaxF\nuN4Ygf5Su/AyLDMcEZC+wIievjGifntiMsD275XjhAfEFrERDNd4Mv59TQnXFeIu\nnkfK/TK42OsJt00asRpHGN+T5jB1qwr4KLNm8GtJkHa0mV/yrqMjFnD7/r+8W4D3\nGzfHAHgLSN0b9bMaBkypGjkad2mEs0ya0BYMy7sfPmXyRdnYl/BOZgWc3E7oHlSm\nGHZJtWMvA2FVZ463WTybOKNOvPKngAvaOvu5FdrkLvg/PqZNcwPQDN5QqLoBqmgj\n18HAAWgBAgMBAAECggEAAPHztnfeXhzsN/j+Dcc0AWCPGRzS7Ohek1kjYUEqwqxO\nouLYvXGytPm2RSetzRG/QjT9ex4/f5wzh8MsYVyNvUw9ayEKjr04ZQHe3mROmj18\nHo8H3eBC8w0NbwMcxLbbD1oFHqlJAvWDs4L22DTd4mUGbh2+mO0RceuzwVMbYv4x\nSEiae+Zn0eMzMTxxool66x1/a5/NZRN/zY/BzpU59XH/I9EjIH7z7/VOdXqiv81d\nuDvYMBrz6fBH2+z5yCKAH8sLgis3jG48eo9Vg4v0h7L4mxAg8gBLAv6DQ+yucbbt\nY+wJDvtolGFYNdDn+G8PzkBR1S6CRl7PCMEpUgJKYQKBgQD9lBSA+9OPSHtFys3D\nU5eOqZDuhtfeVI23RjJjxQQXnWRj+iKIxDVi5kjcY3v15Zf/SAKoFuqwmNLmgnUu\nwQGvUvPhzz2W55eZlZbblC3PahKIO/67UmxZkiOCsVcA1JKClkMukRc57ZhTx/nn\nvS2/zhU5rizhb3v6Gd7MAdTqUQKBgQDGVMdI2HoWqo9+TZaItd3XD7toTwM0/9NM\niMVYNt7gPTY9zvNRELO0E1dD6+syT2iN9hZDiw+/EYLEyskolWDtwY8OsCxLa3Ar\n2o/03UW/SUDZElFObx4zwpeshgfDj01lZDxKlnrfyjrRq07L4ztt6Di7ztRiKKDJ\n8MdWKJWGsQKBgQC+bbX4JyV5NLVedC6RwPTP7gcpGZqDHHxQZibxRcMM+OWrLu1A\nSBjPbKDK4Or2frTmwO09zffxJtM6yD24HrllMKZ1rWxTJxhx/iSMQXsliELijCuA\nASXdHiIMw6DSvtBHwRAyqEMI/aSnRkYmAauZnunRpzuNEGvKJiNqkPWUAQKBgAL9\nbDOw78Y/tAIXcVmGRF3lotGjv0yhPrI8rZzy1tFSmuq7n/ds5Qil8f7YI6eSguUA\n/Lzv78DVpr8Iv5eZCOkMrfduuHw6lmpS1TC/1TlZBV1AZXFlQ3NMT7UOIDfWhTgu\nFqqZMikFh3V5u6pfNpolkhVivNjt+96PfrHR0s9BAoGBAPthivq9vcSXZnX0NcLp\n406+MwrdgV0elm1+Y+Pqnwgssw/pYFHVk0Q4ObMUrYzt/K6xx01v/sjOzuv0fByG\nGgLAAGK+md/Msm8+WpknNJ+Z8wJgsuyC69qltS8LbtwiNNquQyBaFE0R7cj9Gy0i\nUOZ2cWcuxIWHR8unyb/0DI1P\n-----END PRIVATE KEY-----\n
UPSTASH_REDIS_REST_URL=https://central-silkworm-77543.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAS7nAAIncDI2ZWE4Mjc2ODc0NjI0ZTJhOGRmZGQ3NjllNjYyMjU1ZXAyNzc1NDM
SUPABASE_URL=https://hsahapdolvhcuelejvum.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYWhhcGRvbHZoY3VlbGVqdnVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxNzE1MiwiZXhwIjoyMDg5NDkzMTUyfQ.igQyXsfydfKdq-yux-HFWCjDu4jNM3gArIwzEujfZgc
SENTRY_DSN=https://18b1dfcfba31cfcc03b395d5ec44e083@o4511076366811136.ingest.us.sentry.io/4511076375855104
```

### Build Settings (Set in Render Dashboard)
- Root Directory: `server`
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `node dist/server/src/index.js`

## 2. Vercel Frontend Setup

### Environment Variables (Set in Vercel Dashboard)
Go to: https://vercel.com/pulk17s-projects/undercover-game-client/settings/environment-variables

Add these for ALL environments (Production, Preview, Development):

```
VITE_FIREBASE_API_KEY=AIzaSyD9uJCUiTZWRcnzSAGGDi_1SEe7KraUKzE
VITE_FIREBASE_AUTH_DOMAIN=undercover-game-883a6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=undercover-game-883a6
VITE_FIREBASE_APP_ID=1:352944354788:web:ad774d4a215abfb3cc83f1
VITE_GOOGLE_CLIENT_ID=352944354788-gm962s6m2ob8slijnq777v2dhntf9sji.apps.googleusercontent.com
VITE_API_BASE_URL=https://undercover-game-0wnm.onrender.com/api/v1
VITE_SOCKET_URL=https://undercover-game-0wnm.onrender.com
VITE_SENTRY_DSN=https://c8818f96bcdfe79c628c8fa37312856a@o4511076366811136.ingest.us.sentry.io/4511076382343168
```

### Build Settings (Should already be set)
- Framework Preset: Vite
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

## 3. Firebase Configuration

Go to: https://console.firebase.google.com/project/undercover-game-883a6/authentication/settings

### Authorized Domains
Add these domains:
- `undercover-game-client.vercel.app`
- `undercover-game-client-2jhj.vercel.app`
- `undercover-game-0wnm.onrender.com`

## 4. Google OAuth Configuration

Go to: https://console.cloud.google.com/apis/credentials

Find your OAuth 2.0 Client ID and add:

### Authorized JavaScript origins
- `https://undercover-game-client.vercel.app`
- `https://undercover-game-client-2jhj.vercel.app`

### Authorized redirect URIs
- `https://undercover-game-client.vercel.app`
- `https://undercover-game-client-2jhj.vercel.app`

## 5. Deploy Order

1. **Push code to GitHub** (already done)
2. **Wait for Render backend to deploy** (check logs at https://dashboard.render.com/)
3. **Set Vercel environment variables** (step 2 above)
4. **Trigger Vercel redeploy**:
   - Go to Vercel → Deployments
   - Click three dots on latest deployment → Redeploy
   - Uncheck "Use existing Build Cache"
   - Click Redeploy

## 6. Verification Steps

After deployment, test in this order:

1. **Backend health check**: Visit `https://undercover-game-0wnm.onrender.com/api/v1/health`
   - Should return: `{"status":"ok"}`

2. **Frontend loads**: Visit `https://undercover-game-client.vercel.app`
   - Should show splash screen without errors

3. **Guest login**: Click "Continue as Guest"
   - Should login successfully
   - Reload page - should stay logged in

4. **Google login**: Click "Sign in with Google"
   - Should open popup and login
   - Reload page - should stay logged in

5. **Create room**: After login, create a room
   - Should connect to WebSocket
   - Should show room code

## Common Issues

### Issue: "Reconnecting to server" overlay
- Check: Vercel environment variables are set
- Check: `VITE_SOCKET_URL` points to Render backend
- Check: Render `CLIENT_ORIGIN` includes Vercel URLs

### Issue: Login doesn't persist on reload
- Check: Cookies are being set (DevTools → Application → Cookies)
- Check: Cookie has `SameSite=None` and `Secure=true`
- Check: Render backend has latest code with cookie fixes

### Issue: CORS errors
- Check: Render `CLIENT_ORIGIN` includes your Vercel URL
- Check: Backend is deployed with latest code

### Issue: 404 on /api/v1/auth/me
- Check: `VITE_API_BASE_URL` is set in Vercel
- Check: URL includes `/api/v1` prefix
- Check: Render backend is running
