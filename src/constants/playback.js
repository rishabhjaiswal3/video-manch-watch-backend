export const PLAYBACK_EVENT_TYPES = Object.freeze({
  PLAY: 'play',
  PAUSE: 'pause',
  RESUME: 'resume',
  SEEK: 'seek',
  SEEK_END: 'seek_end',
  QUALITY_CHANGE: 'quality_change',
  BUFFER: 'buffer',
  BUFFER_START: 'buffer_start',
  ENDED: 'ended',
  ABANDON: 'abandon',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  WATCHTIME: 'watchtime',
  PROGRESS: 'progress',
  SPEED_CHANGE: 'speed_change',
  PLAYER_INIT: 'player_init',
  PLAYER_DESTROY: 'player_destroy',
  STREAM_INTERRUPTED: 'stream_interrupted',
  STREAM_RESUMED: 'stream_resumed',
});

/**
 * Where a playback originated — the single most important field for
 * measuring recommendation effectiveness and building unbiased training data.
 */
export const PLAYBACK_SOURCES = Object.freeze({
  RECOMMENDATION: 'recommendation',
  SEARCH:         'search',
  HOME_BROWSE:    'home_browse',
  TRENDING:       'trending',
  FOLLOWING:      'following',
  WATCH_LATER:    'watch_later',
  HISTORY:        'history',
  DIRECT:         'direct',
  RELATED:        'related',
  REELS:          'reels',
  UNKNOWN:        'unknown',
});

export const DISCOVERY_EVENT_TYPES = Object.freeze({
  IMPRESSION:  'impression',   // video card entered viewport
  CLICK:       'click',        // user clicked on the card
  SCROLL_PAST: 'scroll_past',  // video card left viewport without click
});

export const PLAYBACK_REDIS = Object.freeze({
  EVENT_QUEUE_KEY: 'vm:events:queue',
  PROGRESS_KEY_PREFIX: 'vm:progress',
  PROGRESS_FIELDS: Object.freeze({
    PROGRESS_SECS: 'progressSecs',
    COMPLETION_PERCENT: 'completionPct',
  }),
});

export const PLAYBACK_INGESTION = Object.freeze({
  MAX_BATCH_SIZE: 200,
  VALID_EVENT_TYPES: new Set(Object.values(PLAYBACK_EVENT_TYPES)),
});

export const PLAYBACK_WORKER = Object.freeze({
  FLUSH_INTERVAL_MS: 5_000,
  BATCH_SIZE: 1_000,
  PROGRESS_TTL_SECONDS: 60 * 60 * 2,
});
