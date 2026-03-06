/**
 * Analytics Worker Service
 *
 * Architecture:
 *   1. Events API receives player events → pushes to Redis list (LPUSH)
 *   2. Every 60 seconds, this worker drains the Redis list (LRANGE + LTRIM)
 *   3. Aggregates events per video and per user
 *   4. Writes aggregated data to MongoDB:
 *      - VideoAnalytics    (per video per day — total views, watch time, etc.)
 *      - UserWatchHistory   (per user × video — individual watch progress)
 *      - UserAnalyticsSummary (per user — totals, streaks)
 *      - ActiveSession      (live viewers — real-time)
 *
 * Redis key used: `vm:analytics:events` (list)
 *
 * This ensures:
 *   - Events survive server restarts (persisted in Redis)
 *   - Minimal MongoDB writes (batched every 60s)
 *   - No data lost on crash (Redis is durable)
 */
interface PlaybackEvent {
    type: 'play' | 'pause' | 'seek' | 'quality_change' | 'buffer' | 'ended' | 'error' | 'heartbeat' | 'watchtime';
    videoId: string;
    userId?: string;
    sessionId: string;
    timestamp: number;
    data: {
        currentTime?: number;
        duration?: number;
        quality?: string;
        volume?: number;
        muted?: boolean;
        buffered?: number;
        playbackRate?: number;
        previousQuality?: string;
        seekFrom?: number;
        seekTo?: number;
        errorCode?: number;
        errorMessage?: string;
        watchTime?: number;
        completionRate?: number;
        videoType?: string;
    };
}
/**
 * Push a batch of events to the Redis list.
 * Called by the events API endpoint.
 */
export declare function pushEventsToRedis(events: PlaybackEvent[]): Promise<number>;
/**
 * Update active sessions in real-time (not batched).
 * Called immediately from the events API for heartbeat/play events.
 */
export declare function updateActiveSession(event: PlaybackEvent): Promise<void>;
/**
 * Remove active session when video ends.
 */
export declare function removeActiveSession(sessionId: string): Promise<void>;
/**
 * Fallback processing path when Redis queueing is unavailable.
 * This keeps creator/admin analytics usable in degraded mode.
 */
export declare function processEventsInline(events: PlaybackEvent[]): Promise<void>;
/**
 * Start the analytics worker.
 * Call this once from your server's startup (index.ts).
 */
export declare function startAnalyticsWorker(): void;
/**
 * Stop the analytics worker.
 * Call this during graceful shutdown.
 */
export declare function stopAnalyticsWorker(): Promise<void>;
declare const _default: {
    pushEventsToRedis: typeof pushEventsToRedis;
    processEventsInline: typeof processEventsInline;
    updateActiveSession: typeof updateActiveSession;
    removeActiveSession: typeof removeActiveSession;
    startAnalyticsWorker: typeof startAnalyticsWorker;
    stopAnalyticsWorker: typeof stopAnalyticsWorker;
};
export default _default;
//# sourceMappingURL=analyticsWorker.d.ts.map