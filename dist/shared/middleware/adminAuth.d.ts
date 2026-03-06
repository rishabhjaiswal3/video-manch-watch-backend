import { Request, Response, NextFunction } from 'express';
/**
 * Middleware that requires admin role
 * Must be used AFTER authenticate middleware
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware that requires admin OR creator role
 * Useful for routes that should be accessible to both
 */
export declare const requireAdminOrCreator: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=adminAuth.d.ts.map