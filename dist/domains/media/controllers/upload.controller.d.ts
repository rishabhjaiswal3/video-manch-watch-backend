import { Request, Response } from 'express';
export declare class UploadController {
    /**
     * Initialize upload
     */
    init(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Complete upload
     */
    complete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get status
     */
    getStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * List videos
     */
    listVideos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Queue stats
     */
    getQueueStats(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Retry upload
     */
    retry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get Raw URL
     */
    getRawUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get thumbnail upload presigned URL
     */
    getThumbnailUploadUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update video
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete video
     */
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=upload.controller.d.ts.map