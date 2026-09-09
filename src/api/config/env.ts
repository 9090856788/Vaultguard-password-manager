import path from 'path';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export const envConfig = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'vaultguard',
  JWT_SECRET: requiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requiredEnv('JWT_REFRESH_SECRET'),
  DATA_DIR: path.join(process.cwd(), '.vault_data'),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 200,          // 200 requests per 15 min per IP
  AUTH_RATE_LIMIT_MAX_REQUESTS: 15,       // 15 auth attempts per 15 min per IP
};
