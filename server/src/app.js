import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { chatRouter } from './routes/chat.routes.js';

export const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.use(chatRouter);
