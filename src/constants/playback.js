export const PLAYBACK_EVENT_TYPES = Object.freeze({
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  SEEK_END: 'seek_end',
  QUALITY_CHANGE: 'quality_change',
  BUFFER: 'buffer',
  BUFFER_START: 'buffer_start',
  ENDED: 'ended',
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
