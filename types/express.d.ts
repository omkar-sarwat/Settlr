// Express type augmentation — adds traceId and userId to Request
// Augment express-serve-static-core (where Request is defined) so the
// augmentation is visible to both express and express-serve-static-core
// consumers, fixing tsc -b build order issues.
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    traceId: string;
    userId?: string;
  }
}
