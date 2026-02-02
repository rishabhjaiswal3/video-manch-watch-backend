# VIDEO MANCH

REST API server for the I_TUBE video streaming platform.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js 18+ | Runtime |
| Express.js | Web Framework |
| TypeScript | Type Safety |
| MongoDB + Mongoose | Database |
| Redis + BullMQ | Job Queue |
| Cloudflare R2 | Object Storage |
| JWT | Authentication |
| Zod | Validation |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   ├── redis.ts         # Redis connection
│   │   └── r2.ts            # Cloudflare R2 config
│   ├── models/
│   │   ├── User.ts          # User schema
│   │   ├── Video.ts         # Video schema
│   │   └── VideoAnalytics.ts # Analytics schema
│   ├── routes/
│   │   ├── auth.ts          # Authentication endpoints
│   │   ├── upload.ts        # Video upload endpoints
│   │   ├── analytics.ts     # Processing analytics
│   │   └── playback.ts      # Playback tracking
│   ├── services/
│   │   ├── queueService.ts  # BullMQ job management
│   │   └── r2Service.ts     # R2 file operations
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   ├── validation.ts    # Request validation
│   │   └── rateLimiter.ts   # Rate limiting
│   ├── schemas/             # Zod validation schemas
│   ├── types/               # TypeScript definitions
│   └── index.ts             # Entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Installation

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
```

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=localhost:27017


# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# CORS
FRONTEND_URL=http://localhost:5173

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_RAW=itube-raw
R2_BUCKET_TRANSCODED=itube-transcoded
R2_BUCKET_THUMBNAILS=itube-thumbnails
R2_PUBLIC_URL=https://your-cdn.com

# Analytics
ANALYTICS_FLUSH_INTERVAL_MS=60000
ANALYTICS_SESSION_TTL_SECONDS=120
```

---

## Usage

### Development
```bash
yarn dev
```

### Production
```bash
yarn build
yarn start
```

---

## API Endpoints

### Health Check
```
GET /health
```
Returns: `{ "status": "ok", "dependencies": { "mongodb": "connected" } }`

### Authentication

```bash
# Register
POST /api/auth/register
Content-Type: application/json
{ "email": "user@example.com", "password": "password123" }

# Login
POST /api/auth/login
Content-Type: application/json
{ "email": "user@example.com", "password": "password123" }
# Returns: { token: "jwt-token", user: {...} }
```

### Video Upload

```bash
# Initialize upload
POST /api/upload/init
Authorization: Bearer <token>
{
  "filename": "video.mp4",
  "fileSize": 1048576,
  "contentType": "video/mp4",
  "title": "My Video"
}
# Returns: { videoId, uploadUrl, expiresIn }

# Complete upload (after uploading to R2)
POST /api/upload/complete
Authorization: Bearer <token>
{ "videoId": "abc-123" }

# Get video status
GET /api/upload/status/:videoId
Authorization: Bearer <token>
```

### Analytics

```bash
# Platform overview
GET /api/analytics/overview
Authorization: Bearer <token>

# Video list with analytics
GET /api/analytics/videos?page=1&limit=10
Authorization: Bearer <token>

# Specific video analytics
GET /api/analytics/video/:videoId
Authorization: Bearer <token>

# Upload trends
GET /api/analytics/trends?days=7
Authorization: Bearer <token>
```

### Playback Analytics

```bash
# Send playback events
POST /api/playback/events
{
  "events": [{
    "type": "heartbeat",
    "videoId": "abc-123",
    "sessionId": "session-xyz",
    "timestamp": 1706540000000,
    "data": { "watchTime": 30, "quality": "720p" }
  }]
}

# Get live viewers
GET /api/playback/live

# Get playback overview
GET /api/playback/overview?days=7

# Get video-specific stats
GET /api/playback/stats/:videoId?days=7
```

---

## Database Models

### Video Schema

```typescript
{
  videoId: String,              // Unique identifier
  userId: String,               // Owner
  title: String,
  description: String,

  originalFile: {
    filename: String,
    size: Number,
    mimeType: String,
    r2Key: String
  },

  originalMetadata: {
    width: Number,
    height: Number,
    duration: Number,
    codec: String,
    bitrate: Number,
    fps: Number
  },

  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed',

  kpis: {
    timings: { download, transcode, upload, total },
    sizes: { original, '1080p', '720p', '480p', '360p', total }
  },

  masterPlaylistUrl: String,
  outputs: [{ quality, playlistUrl, segmentCount, size }],

  thumbnail: String,
  thumbnails: [String],
  tags: [String],
  genres: [String],
  contentType: 'vod' | 'live' | 'reel',

  createdAt: Date,
  updatedAt: Date
}
```

### User Schema

```typescript
{
  userId: String,
  username: String,
  email: String,
  passwordHash: String,
  userType: 'user' | 'creator' | 'admin',

  channelInfo: {
    channelName: String,
    subscriberCount: Number,
    totalViews: Number
  },

  preferences: {
    language: String,
    theme: 'light' | 'dark' | 'auto'
  },

  createdAt: Date,
  lastLoginAt: Date,
  status: 'active' | 'suspended' | 'deleted'
}
```

---

## Database Indexes

```javascript
// Videos
videos.createIndex({ videoId: 1 }, { unique: true })
videos.createIndex({ userId: 1, status: 1 })
videos.createIndex({ contentType: 1 })
videos.createIndex({ tags: 1 })
videos.createIndex({ createdAt: -1 })

// Analytics
videoanalytics.createIndex({ videoId: 1, date: -1 })
videoanalytics.createIndex({ date: -1 })

// Active sessions (TTL auto-cleanup)
activesessions.createIndex({ lastHeartbeat: 1 }, { expireAfterSeconds: 120 })
```

---

## Docker

### Build
```bash
docker build -t itube-backend .
```

### Run
```bash
docker run -p 3000:3000 --env-file .env itube-backend
```

### Docker Compose
```bash
docker-compose up -d
```

---

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Test auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

---

## Related Components

- [Admin Panel](../admin-panel/README.md) - React dashboard
- [Transcoding Engine](../transcoding-engine/README.md) - Video processor
- [Video Player](../videomanch-video-player/README.md) - HLS player
