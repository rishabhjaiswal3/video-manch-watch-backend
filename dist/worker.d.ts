/**
 * VideoManch Analytics Worker — Standalone Process
 *
 * This runs as a SEPARATE process from the API server.
 * It drains analytics events from Redis and persists them to MongoDB.
 *
 * Why separate?
 *   - If the worker crashes → API still serves videos
 *   - If the API crashes → worker still drains events
 *   - Events are stored in Redis, so no data loss either way
 *
 * Start:
 *   npm run worker         (production — compiled JS)
 *   npm run worker:dev     (development — tsx watch)
 */
import 'dotenv/config';
//# sourceMappingURL=worker.d.ts.map