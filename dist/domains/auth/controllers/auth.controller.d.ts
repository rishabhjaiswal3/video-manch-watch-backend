import { Request, Response } from 'express';
export declare class AuthController {
    private getCookieBaseOptions;
    private setAuthCookies;
    private clearAuthCookies;
    private handleRoleLoginFlow;
    signup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    loginUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    loginCreator(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    requestUserPasswordReset(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    requestCreatorPasswordReset(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resetUserPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resetCreatorPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    refresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=auth.controller.d.ts.map