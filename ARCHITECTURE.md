# VideoManch Backend — Architecture Guide

## 🏗️ Architecture Overview

```
VideoManch Platform — Modular Monolith with Process Isolation
═══════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────────────┐
                    │           CLIENTS                       │
                    │  Watch Website │ Creator Portal │ Admin │
                    └────────┬───────┴────────┬───────┴───┬───┘
                             │                │           │
                    ┌────────▼────────────────▼───────────▼───┐
                    │         NGINX / REVERSE PROXY            │
                    │  Routes all /api/* to the backend        │
                    └────────────────┬────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────────┐
              │                API SERVER (index.ts)             │
              │                                                  │
              │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
              │  │   AUTH    │ │  MEDIA   │ │ANALYTICS │ │ADMIN││
              │  │          │ │          │ │          │ │     ││
              │  │ /auth/*  │ │/upload/* │ │/playback/│ │/admin│
              │  │          │ │/videos/* │ │/analytics│ │/config│
              │  └──────────┘ └──────────┘ └────┬─────┘ └─────┘│
              │                                  │              │
              │               Events → LPUSH to Redis           │
              └──────────────────────┬──────────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │    REDIS     │
                              │ Event Queue  │
                              └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────────┐
              │          ANALYTICS WORKER (worker.ts)            │
              │          Separate process — crash-isolated       │
              │                                                  │
              │  Every 60s:                                       │
              │  1. LRANGE + LTRIM from Redis (atomic)           │
              │  2. Aggregate per-video stats                    │
              │  3. Aggregate per-user×video stats               │
              │  4. Write to MongoDB                             │
              └──────────────────────┬──────────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │   MONGODB    │
                              │  VideoAnalytics │
                              │  UserWatchHistory │
                              │  UserAnalyticsSummary │
                              └─────────────┘
```

## 📁 Directory Structure

```
video-manch-backend/src/
├── domains/                    # Domain-organized route modules
│   ├── auth/                   # Authentication domain
│   │   └── routes.ts           #   signup, login, logout, refresh
│   ├── media/                  # Media/Content domain
│   │   ├── upload.routes.ts    #   video upload lifecycle
│   │   ├── videos.routes.ts    #   public video catalog
│   │   └── playback.routes.ts  #   signed HLS streaming
│   ├── analytics/              # Analytics domain
│   │   ├── creator.routes.ts   #   creator dashboard analytics
│   │   └── playback.routes.ts  #   real-time viewer tracking
│   └── admin/                  # Admin domain
│       ├── admin.routes.ts     #   user management
│       └── config.routes.ts    #   platform config
│
├── routes/                     # Actual route implementations
│   ├── auth.ts
│   ├── upload.ts
│   ├── videos.ts
│   ├── playback.ts
│   ├── analytics.ts
│   ├── admin.ts
│   └── config.ts
│
├── models/                     # Mongoose schemas
│   ├── User.ts
│   ├── Video.ts
│   ├── VideoAnalytics.ts
│   ├── UserAnalytics.ts
│   └── AppConfig.ts
│
├── services/                   # Business logic services
│   ├── analyticsWorker.ts      #   Redis → MongoDB aggregation
│   ├── r2Service.ts            #   Cloudflare R2 operations
│   └── queueService.ts         #   BullMQ transcoding queue
│
├── middleware/                 # Express middleware
│   ├── auth.ts                 #   JWT verification
│   ├── adminAuth.ts            #   Admin role check
│   ├── rateLimiter.ts          #   Rate limiting
│   ├── validate.ts             #   Zod validation
│   └── errorHandler.ts         #   Global error handler
│
├── config/                     # Configuration
│   ├── env.ts                  #   Environment variable loading
│   ├── database.ts             #   MongoDB connection
│   ├── redis.ts                #   Redis connection
│   └── r2.ts                   #   R2 client config
│
├── utils/                      # Shared utilities
│   ├── authHelpers.ts
│   └── signedUrl.ts
│
├── schemas/                    # Zod validation schemas
│   ├── auth.ts
│   └── upload.ts
│
├── types/                      # TypeScript type definitions
│
├── index.ts                    # ⚡ API Server entry point
└── worker.ts                   # ⚡ Analytics Worker entry point
```

## 🔌 API Endpoint Map by Domain

### 🔐 AUTH Domain
Used by: Creator Portal, Admin Panel

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh JWT tokens |

### 🎬 MEDIA Domain
Used by: Creator Portal, Watch Website

| Method | Path | Used By | Description |
|--------|------|---------|-------------|
| POST | `/upload/init` | Creator | Initialize upload, get presigned R2 URL |
| POST | `/upload/complete` | Creator | Mark upload complete, queue transcoding |
| GET | `/upload/status/:videoId` | Creator | Check transcoding status |
| GET | `/upload/queue-stats` | Creator | BullMQ queue statistics |
| GET | `/upload/videos` | Creator | List creator's videos |
| POST | `/upload/retry/:videoId` | Creator | Retry failed transcoding |
| GET | `/upload/raw-url/:videoId` | Creator | Get presigned URL for raw video |
| PATCH | `/upload/video/:videoId` | Creator | Update video metadata |
| DELETE | `/upload/video/:videoId` | Creator | Soft-delete video |
| GET | `/videos` | Watch | Public video listings |
| GET | `/videos/:videoId` | Watch | Single video details |
| GET | `/videos/type/reels` | Watch | Reels feed |

### 📊 ANALYTICS Domain
Used by: Watch Website, Creator Portal, Video Player

| Method | Path | Used By | Description |
|--------|------|---------|-------------|
| POST | `/playback/events` | Watch, Player | Ingest analytics events → Redis |
| GET | `/playback/stats/:videoId` | Creator | Historical video playback stats |
| GET | `/playback/concurrent/:videoId` | Creator | Current live viewers |
| GET | `/playback/live` | Creator | All live viewer sessions |
| GET | `/playback/overview` | Creator | Playback overview dashboard |
| GET | `/playback/user/:userId/history` | Watch | User's watch history |
| GET | `/playback/user/:userId/continue` | Watch | Continue watching list |
| GET | `/playback/user/:userId/stats` | Watch | User's personal stats |
| GET | `/analytics/overview` | Creator | Processing/transcode analytics |
| GET | `/analytics/videos` | Creator | Per-video processing stats |
| GET | `/analytics/video/:videoId` | Creator | Single video processing details |
| GET | `/analytics/trends` | Creator | Upload/processing trends |

### ⚙️ ADMIN Domain
Used by: Admin Panel, Creator Portal

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:userId` | User details |
| PATCH | `/admin/users/:userId/role` | Update user role |
| GET | `/admin/stats` | Platform statistics |
| GET | `/config/player` | Get player script URL |
| POST | `/config/player` | Update player script URL |

## 🚀 Running the System

### Development

```bash
# Terminal 1 — API Server
npm run dev

# Terminal 2 — Analytics Worker
npm run dev:worker

# Or run both at once:
npm run dev:all
```

### Production

```bash
npm run build

# Process 1 — API Server
npm run start

# Process 2 — Analytics Worker
npm run start:worker
```

## 🔄 Process Isolation Benefits

| Scenario | Before (Single Process) | After (Isolated) |
|----------|------------------------|-------------------|
| Worker bug causes crash | API goes down too | API keeps serving |
| API gets overwhelmed | Events stop processing | Worker keeps running |
| Memory leak in aggregation | Whole server OOM | Only worker restarts |
| Deploy API changes | Worker restarts | Worker unaffected |
| Scale analytics independently | Can't | Run more workers |

## 🛡️ Data Safety

Events are **never lost** thanks to Redis as a buffer:

1. Frontend sends events → API pushes to Redis (`LPUSH`) → returns immediately
2. Worker reads from Redis (`LRANGE + LTRIM`) atomically
3. If worker crashes before writing to MongoDB → events stay in Redis
4. On restart, worker picks up where it left off

## 📈 Future Scaling Path

When you outgrow this architecture, each domain can be extracted into a separate service:

```
Phase 1 (NOW):     Modular Monolith + Worker Process     ← You are here
Phase 2 (10K DAU):  Extract Analytics Service
Phase 3 (50K DAU):  Extract Media Service
Phase 4 (100K DAU): Extract Auth Service + API Gateway
```

Each phase is incremental — no big-bang rewrites needed.
