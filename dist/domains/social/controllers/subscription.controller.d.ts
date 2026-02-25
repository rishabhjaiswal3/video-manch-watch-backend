import { Request, Response } from 'express';
export declare class SubscriptionController {
    /**
     * Subscribe to a creator
     */
    subscribe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Unsubscribe from a creator
     */
    unsubscribe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get subscription status
     */
    getSubscriptionStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Toggle notifications
     */
    toggleNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get channels the user is following
     */
    getFollowing(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get user's subscribers (for creators)
     */
    getSubscribers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=subscription.controller.d.ts.map