import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateChangePasswordInput, validateLoginInput, validateRegisterInput } from '../validation/authValidation';
import { authService } from '../services/authService';
import { clearAuthCookies, readRequestCookie, REFRESH_COOKIE, setAuthCookies } from '../utils/sessionCookies';

function requestMetadata(request: Request) {
  return { userAgent: request.get('user-agent'), ipPrefix: request.ip };
}

function authResponse(response: Response, result: { accessToken: string; refreshToken: string; user: unknown }, status = 200) {
  setAuthCookies(response, result.refreshToken);
  response.status(status).json({ token: result.accessToken, user: result.user });
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(validateRegisterInput(req.body), requestMetadata(req));
    authResponse(res, result, 201);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(validateLoginInput(req.body), requestMetadata(req));
    authResponse(res, result);
  },

  async refreshToken(req: Request, res: Response) {
    const refreshToken = readRequestCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired session.', requestId: (req as AuthenticatedRequest).requestId } });
      return;
    }
    const result = await authService.refresh(refreshToken, requestMetadata(req));
    authResponse(res, result);
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRequestCookie(req, REFRESH_COOKIE));
    clearAuthCookies(res);
    res.status(204).send();
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({ user });
  },

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    const fullName = req.body?.fullName;
    const avatarUrl = req.body?.avatarUrl;
    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length < 1 || fullName.length > 160)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Full name is invalid.', requestId: req.requestId } });
      return;
    }
    if (avatarUrl !== undefined && (typeof avatarUrl !== 'string' || avatarUrl.length > 2048)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Avatar URL is invalid.', requestId: req.requestId } });
      return;
    }
    const user = await authService.updateProfile(req.user!.id, { fullName: fullName?.trim(), avatarUrl });
    res.json({ user });
  },

  async changePassword(req: AuthenticatedRequest, res: Response) {
    await authService.changePassword(req.user!.id, validateChangePasswordInput(req.body));
    res.json({ message: 'Password changed successfully.' });
  },
};
