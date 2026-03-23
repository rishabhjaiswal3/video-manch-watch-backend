const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
];

const OPTIONAL_VARS = {
  NODE_ENV: 'development',
  PORT: 3000,
  FRONTEND_URL: 'http://localhost:5173',
  REDIS_PORT: 6379,
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
};

export const loadEnvironment = () => {
  const errors = [];

  for (const name of REQUIRED_VARS) {
    const value = process.env[name];
    if (!value || !value.trim()) {
      errors.push(`${name} is required but not set`);
    }
  }

  if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different');
  }

  if (errors.length > 0) {
    console.error('\n[ENV] Missing required environment variables:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Apply defaults for optional vars
  for (const [name, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[name]) {
      process.env[name] = String(defaultValue);
    }
  }

  console.log('[ENV] Environment validated');

  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT, 10) || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  };
};
