import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin or non-browser clients without an Origin header.
      if (!origin) return callback(null, true);
      if (env.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
