import { Request, Response } from 'express';
export declare class VideoController {
    registerVod(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listVideos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listReels(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=video.controller.d.ts.map