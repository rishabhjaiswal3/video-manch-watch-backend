/**
 * VideoManch API Server
 *
 * Architecture: Modular Monolith with 5 Domains
 *
 *   ┌────────────────────────────────────────────────────────────────────────────┐
 *   │                           API SERVER (this file)                           │
 *   ├─────────────┬────────────┬───────────────┬─────────────────┬──────────────┤
 *   │   AUTH      │   MEDIA    │  ANALYTICS    │     ADMIN       │    SOCIAL    │
 *   │             │            │               │                 │              │
 *   │  /auth/*    │  /upload/* │  /analytics/* │  /admin/*       │  /profile/*  │
 *   │             │  /videos/* │  /playback/*  │  /config/*      │  /engage/*   │
 *   │             │            │               │                 │  /subs/*     │
 *   │  signup     │  init      │  overview     │  users          │  /comments/* │
 *   │  login      │  complete  │  videos       │  roles          │              │
 *   │  logout     │  status    │  trends       │  stats          │  profiles    │
 *   │  refresh    │  stream    │  events       │  player config  │  likes       │
 *   │             │            │               │                 │  subscribe   │
 *   │             │            │               │                 │  comments    │
 *   └─────────────┴────────────┴───────────────┴─────────────────┴──────────────┘
 *
 *   The Analytics Worker runs as a SEPARATE process (src/worker.ts)
 *   to isolate event processing from the API serving path.
 */
import 'dotenv/config';
//# sourceMappingURL=index.d.ts.map