import mongoose, { Schema } from 'mongoose';

/**
 * RecommendationJobRun — audit trail for Python worker executions.
 *
 * Written by the Python worker at end of each run. Ops can alert when:
 *   - No successful run in the last N hours (generatedAt staleness)
 *   - usersProcessed drops significantly (data pipeline issue)
 *   - status = 'failed' for consecutive runs
 */
const RecommendationJobRunSchema = new Schema(
  {
    jobId:          { type: String, required: true, unique: true },  // uuid from worker
    startedAt:      { type: Date, required: true },
    finishedAt:     { type: Date, default: null },
    status:         { type: String, enum: ['running', 'success', 'failed', 'partial'], default: 'running' },
    usersProcessed: { type: Number, default: 0 },
    usersFailed:    { type: Number, default: 0 },
    durationMs:     { type: Number, default: null },
    modelVersion:   { type: String, required: true },
    errorMessage:   { type: String, default: null },
  },
  { timestamps: false, versionKey: false }
);

RecommendationJobRunSchema.index({ startedAt: -1 });

export const RecommendationJobRun = mongoose.model('RecommendationJobRun', RecommendationJobRunSchema);
