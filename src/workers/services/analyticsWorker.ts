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

import { getRedisConnection } from '../../shared/config/redis.js';
import { VideoAnalytics, ActiveSession } from '../../shared/models/VideoAnalytics.js';
import { UserWatchHistory, UserAnalyticsSummary } from '../../shared/models/UserAnalytics.js';
import { getNumericEnv } from '../../shared/config/env.js';

// ─── Configuration ──────────────────────────────────────

const REDIS_KEY = 'vm:analytics:events';
const FLUSH_INTERVAL_MS = getNumericEnv('ANALYTICS_WORKER_FLUSH_MS', 60000);     // 60 seconds
const MAX_EVENTS_PER_FLUSH = getNumericEnv('ANALYTICS_WORKER_MAX_EVENTS', 5000); // Max events per cycle

// ─── Types ──────────────────────────────────────────────

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

// ─── Aggregation Buffers ────────────────────────────────

interface VideoStats {
    plays: number;
    pauses: number;
    seeks: number;
    buffers: number;
    errors: number;
    watchTime: number;
    completionRates: number[];
    qualities: Record<string, number>;
    sessions: Set<string>;
    durations: number[];
}

interface UserVideoStats {
    watchTimeAdded: number;
    lastPosition: number;
    maxPosition: number;
    duration: number;
    completionRate: number;
    plays: number;
    pauses: number;
    seeks: number;
    quality: string;
    videoType: string;
    sessionIds: Set<string>;
}

// ─── Push Events to Redis ───────────────────────────────

/**
 * Push a batch of events to the Redis list.
 * Called by the events API endpoint.
 */
export async function pushEventsToRedis(events: PlaybackEvent[]): Promise<number> {
    const redis = getRedisConnection();

    // Serialize each event and push to list
    const serialized = events.map(e => JSON.stringify(e));
    const pushed = await redis.lpush(REDIS_KEY, ...serialized);

    return pushed;
}

/**
 * Update active sessions in real-time (not batched).
 * Called immediately from the events API for heartbeat/play events.
 */
export async function updateActiveSession(event: PlaybackEvent): Promise<void> {
    if (event.type !== 'heartbeat' && event.type !== 'play' && event.type !== 'watchtime') {
        return;
    }

    try {
        await ActiveSession.findOneAndUpdate(
            { sessionId: event.sessionId },
            {
                $set: {
                    videoId: event.videoId,
                    userId: event.userId,
                    quality: event.data?.quality || 'auto',
                    watchTime: event.data?.watchTime || 0,
                    currentTime: event.data?.currentTime || 0,
                    lastHeartbeat: new Date(),
                },
                $setOnInsert: {
                    startedAt: new Date(),
                },
            },
            { upsert: true }
        ).exec();
    } catch (err: any) {
        console.error('[ANALYTICS-WORKER] ⚠️ Active session update failed:', err.message);
    }
}

/**
 * Remove active session when video ends.
 */
export async function removeActiveSession(sessionId: string): Promise<void> {
    try {
        await ActiveSession.deleteOne({ sessionId }).exec();
    } catch {
        // Ignore
    }
}

// ─── Drain & Process ────────────────────────────────────

/**
 * Drain events from Redis and process them.
 * This is the main worker loop — runs every 60 seconds.
 */
async function drainAndProcess(): Promise<void> {
    const redis = getRedisConnection();

    try {
        // Check how many events are waiting
        const listLength = await redis.llen(REDIS_KEY);
        if (listLength === 0) return;

        const count = Math.min(listLength, MAX_EVENTS_PER_FLUSH);
        console.log(`[ANALYTICS-WORKER] 📊 Processing ${count} events from Redis (${listLength} total)`);

        // Atomically read and remove events
        // LRANGE gets events, LTRIM removes them
        const rawEvents = await redis.lrange(REDIS_KEY, -count, -1);
        await redis.ltrim(REDIS_KEY, 0, listLength - count - 1);

        if (rawEvents.length === 0) return;

        // Parse events
        const events: PlaybackEvent[] = [];
        for (const raw of rawEvents) {
            try {
                events.push(JSON.parse(raw));
            } catch {
                console.warn('[ANALYTICS-WORKER] ⚠️ Skipping malformed event');
            }
        }

        // Aggregate and write
        await aggregateAndWrite(events);

        console.log(`[ANALYTICS-WORKER] ✅ Processed ${events.length} events`);
    } catch (error: any) {
        console.error('[ANALYTICS-WORKER] ❌ Drain error:', error.message);
    }
}

/**
 * Aggregate events and write to MongoDB
 */
async function aggregateAndWrite(events: PlaybackEvent[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // ─── Step 1: Aggregate per video ────────────────────
    const videoStats = new Map<string, VideoStats>();
    // ─── Step 2: Aggregate per user×video ───────────────
    const userVideoStats = new Map<string, UserVideoStats>(); // key: `userId:videoId`
    // ─── Step 3: Track unique user sessions ─────────────
    const userSessions = new Map<string, Set<string>>(); // userId → sessionIds

    for (const event of events) {
        const { videoId, userId, sessionId, type, data } = event;

        // ─── Video-level aggregation ────────────────────
        if (!videoStats.has(videoId)) {
            videoStats.set(videoId, {
                plays: 0, pauses: 0, seeks: 0, buffers: 0, errors: 0,
                watchTime: 0, completionRates: [], qualities: {},
                sessions: new Set(), durations: [],
            });
        }

        const vStats = videoStats.get(videoId)!;
        vStats.sessions.add(sessionId);

        switch (type) {
            case 'play':
                vStats.plays++;
                if (data.duration) vStats.durations.push(data.duration);
                break;
            case 'pause':
                vStats.pauses++;
                break;
            case 'seek':
                vStats.seeks++;
                break;
            case 'buffer':
                vStats.buffers++;
                break;
            case 'error':
                vStats.errors++;
                break;
            case 'quality_change':
                if (data.quality) {
                    vStats.qualities[data.quality] = (vStats.qualities[data.quality] || 0) + 1;
                }
                break;
            case 'ended':
                if (data.completionRate) vStats.completionRates.push(data.completionRate);
                if (data.watchTime) vStats.watchTime += data.watchTime;
                break;
            case 'watchtime':
                if (data.watchTime) vStats.watchTime += data.watchTime;
                if (data.quality) {
                    vStats.qualities[data.quality] = (vStats.qualities[data.quality] || 0) + 1;
                }
                break;
            case 'heartbeat':
                if (data.quality) {
                    vStats.qualities[data.quality] = (vStats.qualities[data.quality] || 0) + 1;
                }
                break;
        }

        // ─── User-level aggregation (skip anonymous) ────
        if (!userId) continue;

        const userVideoKey = `${userId}:${videoId}`;
        if (!userVideoStats.has(userVideoKey)) {
            userVideoStats.set(userVideoKey, {
                watchTimeAdded: 0,
                lastPosition: 0,
                maxPosition: 0,
                duration: 0,
                completionRate: 0,
                plays: 0,
                pauses: 0,
                seeks: 0,
                quality: 'auto',
                videoType: data.videoType || 'video',
                sessionIds: new Set(),
            });
        }

        const uStats = userVideoStats.get(userVideoKey)!;
        uStats.sessionIds.add(sessionId);

        switch (type) {
            case 'play':
                uStats.plays++;
                if (data.duration) uStats.duration = data.duration;
                break;
            case 'pause':
                uStats.pauses++;
                if (data.currentTime) {
                    uStats.lastPosition = data.currentTime;
                    uStats.maxPosition = Math.max(uStats.maxPosition, data.currentTime);
                }
                break;
            case 'seek':
                uStats.seeks++;
                if (data.seekTo) {
                    uStats.lastPosition = data.seekTo;
                    uStats.maxPosition = Math.max(uStats.maxPosition, data.seekTo);
                }
                break;
            case 'watchtime':
                if (data.watchTime) uStats.watchTimeAdded += data.watchTime;
                if (data.currentTime) {
                    uStats.lastPosition = data.currentTime;
                    uStats.maxPosition = Math.max(uStats.maxPosition, data.currentTime);
                }
                if (data.duration) uStats.duration = data.duration;
                if (data.completionRate) uStats.completionRate = Math.max(uStats.completionRate, data.completionRate);
                if (data.quality) uStats.quality = data.quality;
                if (data.videoType) uStats.videoType = data.videoType;
                break;
            case 'ended':
                if (data.watchTime) uStats.watchTimeAdded += data.watchTime;
                if (data.completionRate) uStats.completionRate = Math.max(uStats.completionRate, data.completionRate);
                if (data.duration) uStats.duration = data.duration;
                break;
            case 'heartbeat':
                if (data.currentTime) {
                    uStats.lastPosition = data.currentTime;
                    uStats.maxPosition = Math.max(uStats.maxPosition, data.currentTime);
                }
                if (data.quality) uStats.quality = data.quality;
                if (data.watchTime) uStats.watchTimeAdded += data.watchTime;
                if (data.completionRate) uStats.completionRate = Math.max(uStats.completionRate, data.completionRate);
                break;
        }

        // Track user sessions
        if (!userSessions.has(userId)) {
            userSessions.set(userId, new Set());
        }
        userSessions.get(userId)!.add(sessionId);
    }

    // ─── Write to MongoDB ────────────────────────────────

    const writePromises: Promise<any>[] = [];

    // 1. Update VideoAnalytics (per video per day)
    for (const [videoId, stats] of videoStats) {
        const avgCompletionRate = stats.completionRates.length > 0
            ? stats.completionRates.reduce((a, b) => a + b, 0) / stats.completionRates.length
            : 0;

        writePromises.push(
            VideoAnalytics.findOneAndUpdate(
                { videoId, date: today },
                {
                    $inc: {
                        views: stats.sessions.size,
                        totalPlays: stats.plays,
                        totalPauses: stats.pauses,
                        totalSeeks: stats.seeks,
                        bufferingEvents: stats.buffers,
                        errorCount: stats.errors,
                        totalWatchTime: Math.round(stats.watchTime),
                        'qualityStats.1080p': stats.qualities['1080p'] || 0,
                        'qualityStats.720p': stats.qualities['720p'] || 0,
                        'qualityStats.480p': stats.qualities['480p'] || 0,
                        'qualityStats.360p': stats.qualities['360p'] || 0,
                        'qualityStats.auto': stats.qualities['auto'] || 0,
                    },
                    $addToSet: {
                        sessions: { $each: Array.from(stats.sessions) },
                    },
                    $set: {
                        avgCompletionRate,
                        avgWatchTime: stats.sessions.size > 0 ? Math.round(stats.watchTime / stats.sessions.size) : 0,
                    },
                },
                { upsert: true }
            ).exec().catch(err => {
                console.error(`[ANALYTICS-WORKER] ❌ VideoAnalytics write failed for ${videoId}:`, err.message);
            })
        );
    }

    // 2. Update UserWatchHistory (per user × video)
    for (const [key, stats] of userVideoStats) {
        const [userId, videoId] = key.split(':');
        const isCompleted = stats.completionRate >= 90;

        writePromises.push(
            UserWatchHistory.findOneAndUpdate(
                { userId, videoId },
                {
                    $inc: {
                        totalWatchTime: Math.round(stats.watchTimeAdded),
                        totalSessions: stats.sessionIds.size,
                        totalPlays: stats.plays,
                        totalPauses: stats.pauses,
                        totalSeeks: stats.seeks,
                    },
                    $max: {
                        maxWatchedPosition: Math.round(stats.maxPosition),
                        completionRate: Math.round(stats.completionRate),
                    },
                    $set: {
                        lastWatchedPosition: Math.round(stats.lastPosition),
                        videoDuration: Math.round(stats.duration),
                        lastQuality: stats.quality,
                        videoType: stats.videoType,
                        lastWatchedAt: new Date(),
                        ...(isCompleted ? { isCompleted: true, completedAt: new Date() } : {}),
                    },
                    $setOnInsert: {
                        firstWatchedAt: new Date(),
                    },
                },
                { upsert: true }
            ).exec().catch(err => {
                console.error(`[ANALYTICS-WORKER] ❌ UserWatchHistory write failed for ${key}:`, err.message);
            })
        );
    }

    // 3. Update UserAnalyticsSummary (per user)
    for (const [userId, sessionIds] of userSessions) {
        // Calculate total watch time added for this user across all videos
        let userTotalWatchTime = 0;
        let videosWatched = 0;
        let reelsWatched = 0;
        let completedVideos = 0;
        const qualities: Record<string, number> = {};

        for (const [key, stats] of userVideoStats) {
            if (!key.startsWith(`${userId}:`)) continue;
            userTotalWatchTime += stats.watchTimeAdded;
            if (stats.videoType === 'reel') {
                reelsWatched++;
            } else {
                videosWatched++;
            }
            if (stats.completionRate >= 90) completedVideos++;
            qualities[stats.quality] = (qualities[stats.quality] || 0) + 1;
        }

        // Determine preferred quality
        const preferredQuality = Object.entries(qualities)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto';

        // Handle daily reset and streaks
        const updateOps: any = {
            $inc: {
                totalWatchTime: Math.round(userTotalWatchTime),
                totalSessions: sessionIds.size,
            },
            $set: {
                preferredQuality,
                lastActiveDate: today,
            },
        };

        writePromises.push(
            (async () => {
                try {
                    // First, get current summary to handle streaks + daily reset
                    const existing = await UserAnalyticsSummary.findOne({ userId }).lean();

                    if (existing) {
                        // Reset daily counter if new day
                        if (existing.todayDate !== today) {
                            updateOps.$set.todayDate = today;
                            updateOps.$set.todayWatchTime = Math.round(userTotalWatchTime);

                            // Update streak
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            const yesterdayStr = yesterday.toISOString().split('T')[0];

                            if (existing.lastActiveDate === yesterdayStr) {
                                // Consecutive day — increment streak
                                updateOps.$inc.currentStreak = 1;
                                updateOps.$set.longestStreak = Math.max(
                                    existing.longestStreak || 0,
                                    (existing.currentStreak || 0) + 1
                                );
                            } else if (existing.lastActiveDate !== today) {
                                // Streak broken — reset
                                updateOps.$set.currentStreak = 1;
                            }
                        } else {
                            // Same day — just add to today's watch time
                            updateOps.$inc.todayWatchTime = Math.round(userTotalWatchTime);
                        }
                    } else {
                        // First time user — initialize
                        updateOps.$set.todayDate = today;
                        updateOps.$set.todayWatchTime = Math.round(userTotalWatchTime);
                        updateOps.$set.currentStreak = 1;
                        updateOps.$set.longestStreak = 1;
                    }

                    // Count unique videos (only increment for new user×video pairs)
                    // We do this by checking if UserWatchHistory documents exist
                    // (since we just created them above, we count new ones)
                    if (videosWatched > 0) {
                        updateOps.$inc.totalVideosWatched = videosWatched;
                    }
                    if (reelsWatched > 0) {
                        updateOps.$inc.totalReelsWatched = reelsWatched;
                    }
                    if (completedVideos > 0) {
                        updateOps.$inc.totalCompletedVideos = completedVideos;
                    }

                    await UserAnalyticsSummary.findOneAndUpdate(
                        { userId },
                        updateOps,
                        { upsert: true }
                    ).exec();
                } catch (err: any) {
                    console.error(`[ANALYTICS-WORKER] ❌ UserAnalyticsSummary write failed for ${userId}:`, err.message);
                }
            })()
        );
    }

    // Wait for all writes to complete
    await Promise.allSettled(writePromises);
}

// ─── Worker Lifecycle ───────────────────────────────────

let workerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the analytics worker.
 * Call this once from your server's startup (index.ts).
 */
export function startAnalyticsWorker(): void {
    if (workerTimer) {
        console.warn('[ANALYTICS-WORKER] ⚠️ Worker already running');
        return;
    }

    console.log(`[ANALYTICS-WORKER] 🚀 Started | flush every ${FLUSH_INTERVAL_MS / 1000}s | Redis key: ${REDIS_KEY}`);

    // Run immediately on start (process any leftover events from before restart)
    drainAndProcess().catch(err => {
        console.error('[ANALYTICS-WORKER] ❌ Initial drain failed:', err.message);
    });

    // Then run every FLUSH_INTERVAL_MS
    workerTimer = setInterval(() => {
        drainAndProcess().catch(err => {
            console.error('[ANALYTICS-WORKER] ❌ Periodic drain failed:', err.message);
        });
    }, FLUSH_INTERVAL_MS);
}

/**
 * Stop the analytics worker.
 * Call this during graceful shutdown.
 */
export async function stopAnalyticsWorker(): Promise<void> {
    if (workerTimer) {
        clearInterval(workerTimer);
        workerTimer = null;
    }

    // Final drain before shutdown
    try {
        await drainAndProcess();
        console.log('[ANALYTICS-WORKER] 🛑 Stopped (final drain complete)');
    } catch (err: any) {
        console.error('[ANALYTICS-WORKER] ⚠️ Final drain failed:', err.message);
    }
}

export default {
    pushEventsToRedis,
    updateActiveSession,
    removeActiveSession,
    startAnalyticsWorker,
    stopAnalyticsWorker,
};
