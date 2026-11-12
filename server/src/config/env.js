import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  TAVILY_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
});

// Throws a clear error if a variable is missing
export const env = envSchema.parse(process.env);
