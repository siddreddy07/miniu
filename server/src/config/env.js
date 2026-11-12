import 'dotenv/config';
import { z } from 'zod';

// The env variables we need, and what they must look like
const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  TAVILY_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Missing or wrong env variables. Check server/.env');
  console.error(result.error.issues.map((i) => i.path[0] + ': ' + i.message).join('\n'));
  process.exit(1);
}

export const env = result.data;
