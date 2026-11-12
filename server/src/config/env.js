import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  TAVILY_API_KEY: z.string().min(1, 'TAVILY_API_KEY is required'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`Invalid environment:\n${issues}\nCopy server/.env.example to server/.env and fill it in.`);
  process.exit(1);
}

export const env = parsed.data;
