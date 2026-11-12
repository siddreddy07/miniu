import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.routes.js';

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.use(chatRouter);
