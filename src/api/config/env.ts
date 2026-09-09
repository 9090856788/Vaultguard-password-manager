import path from 'path';

export const envConfig = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'vaultguard_super_secret_jwt_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'vaultguard_refresh_secret_key_2026',
  DATA_DIR: path.join(process.cwd(), '.vault_data'),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 200,          // 200 requests per 15 min per IP
  AUTH_RATE_LIMIT_MAX_REQUESTS: 15,       // 15 auth attempts per 15 min per IP
};
