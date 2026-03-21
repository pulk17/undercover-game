import { z } from 'zod';

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
  VITE_API_BASE_URL: z.string().min(1),
  VITE_SOCKET_URL: z.string().min(1),
  VITE_SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Debug: Log all environment variables
console.log('🔍 [ENV DEBUG] Raw import.meta.env:', import.meta.env);
console.log('🔍 [ENV DEBUG] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔍 [ENV DEBUG] VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);

const result = envSchema.safeParse(import.meta.env);

if (!result.success) {
  console.error('❌ [ENV DEBUG] Validation failed:', result.error.issues);
  const missing = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid client environment variables:\n${missing}`);
}

console.log('✅ [ENV DEBUG] Validation passed. Using:', {
  VITE_API_BASE_URL: result.data.VITE_API_BASE_URL,
  VITE_SOCKET_URL: result.data.VITE_SOCKET_URL,
});

export const env: Env = result.data;
