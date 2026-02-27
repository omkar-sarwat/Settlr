// Auth routes — register, login, refresh, logout (public routes, no auth required)
// Profile routes — require x-user-id header from gateway (protected)
import { Router } from 'express';
import { registerHandler, loginHandler, refreshHandler, logoutHandler, getProfileHandler, updateProfileHandler } from '../handlers/auth.handler';
import { internalAuth } from '../middleware/internalAuth.middleware';

export const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

// Profile routes (protected — gateway sets x-user-id after JWT verification)
authRouter.get('/profile', internalAuth, getProfileHandler);
authRouter.patch('/profile', internalAuth, updateProfileHandler);
