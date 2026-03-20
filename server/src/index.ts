import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { wordsRouter } from './routes/words';
import { socialRouter } from './routes/social';
import { leaderboardRouter } from './routes/leaderboard';
import { healthRouter } from './routes/health';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerGameHandlers } from './handlers/gameHandlers';
import { env } from './env';

// Initialize Sentry before anything else
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  },
});

// Socket.IO auth middleware
io.use(socketAuthMiddleware);

// Socket.IO rate limiting: 60 events per minute per socket
io.use((socket, next) => {
  const eventCounts = new Map<string, { count: number; resetAt: number }>();

  const originalOnEvent = socket.onAny.bind(socket);
  originalOnEvent((_eventName: string) => {
    const now = Date.now();
    const windowMs = 60_000;
    const maxEvents = 60;

    const entry = eventCounts.get('__global__');
    if (!entry || now >= entry.resetAt) {
      eventCounts.set('__global__', { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > maxEvents) {
        socket.emit('error', { message: 'Rate limit exceeded: too many events' });
        socket.disconnect(true);
        return;
      }
    }
  });

  next();
});

// Middleware
// 19.1: Helmet applied early in the chain
app.use(helmet());
// 19.2: CORS restricted to configured frontend origin
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// 19.3: Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests, please try again later.' } },
});

const wordsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests, please try again later.' } },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests, please try again later.' } },
});

// Routes
const apiRouter = Router();
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authLimiter, authRouter);
apiRouter.use('/profile', generalLimiter, profileRouter);
apiRouter.use('/words', wordsLimiter, wordsRouter);
apiRouter.use('/social', generalLimiter, socialRouter);
apiRouter.use('/leaderboard', generalLimiter, leaderboardRouter);
app.use('/api/v1', apiRouter);

// Sentry error handler must be after routes
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Socket.IO connection handlers
io.on('connection', (socket) => {
  registerRoomHandlers(socket, io);
  registerGameHandlers(socket, io);
});

// Start server
const PORT = env.PORT;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app, io };
