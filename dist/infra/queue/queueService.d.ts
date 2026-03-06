import { Queue } from 'bullmq';
export interface TranscodeJobData {
    videoId: string;
    userId: string;
    userType: 'user' | 'creator';
    r2Key: string;
    qualities: string[];
}
type TranscodeQueue = Queue<TranscodeJobData, unknown, string>;
export declare const getQueues: () => {
    userQueue: TranscodeQueue;
    creatorQueue: TranscodeQueue;
};
export declare const queueService: {
    /**
     * Add a transcoding job to the appropriate queue
     */
    addTranscodeJob(data: TranscodeJobData): Promise<string>;
    /**
     * Get job status
     */
    getJobStatus(videoId: string, userType?: "user" | "creator"): Promise<{
        id: string | undefined;
        state: "unknown" | import("bullmq").JobState;
        progress: import("bullmq").JobProgress;
        data: TranscodeJobData;
        failedReason: string;
        processedOn: number | undefined;
        finishedOn: number | undefined;
    } | null>;
    /**
     * Get queue stats
     */
    getQueueStats(userType?: "user" | "creator"): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
};
export {};
//# sourceMappingURL=queueService.d.ts.map