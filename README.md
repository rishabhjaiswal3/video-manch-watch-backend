# video-manch-watch-backend

Express backend for the watch platform.

## Current Scope

- User auth and profile APIs
- Public video and reels listing APIs
- Social APIs: comments, engagement, subscriptions, playlists, watch later, reel reports
- MongoDB, Redis, Socket.IO, and Morgan request timing logs

## Run

```bash
npm install
npm run dev
```

## Environment

Required:

- `MONGODB_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Common optional:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `REDIS_URL`

## Entry Points

- `src/server.js`
- `src/app.js`
