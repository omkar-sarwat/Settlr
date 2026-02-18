// Express type augmentation — adds traceId and userId to Request
import 'express';

declare module 'express' {
  interface Request {
    traceId: string;
    userId?: string;
  }
}
