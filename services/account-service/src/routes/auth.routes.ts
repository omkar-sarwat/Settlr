// Auth routes — register, login, refresh, logout (public routes, no auth required)
import { Router } from 'express';
import { registerHandler, loginHandler, refreshHandler, logoutHandler } from '../handlers/auth.handler';

export const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
