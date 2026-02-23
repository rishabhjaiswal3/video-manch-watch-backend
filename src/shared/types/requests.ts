import type { Request } from 'express';

export type UserType = 'user' | 'creator' | 'admin';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  userType: UserType;
}

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
}
