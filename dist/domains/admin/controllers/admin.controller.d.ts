import { Request, Response } from 'express';
export declare class AdminController {
    /**
     * GET /api/admin/users
     */
    getUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/users/:userId
     */
    getUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /api/admin/users/:userId/role
     */
    updateUserRole(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/stats
     */
    getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=admin.controller.d.ts.map