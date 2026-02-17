import { Request, Response } from 'express';
export declare class ConfigController {
    /**
     * GET /api/config/player
     */
    getPlayerConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/config/player
     */
    updatePlayerConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=config.controller.d.ts.map