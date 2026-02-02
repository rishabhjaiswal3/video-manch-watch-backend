/**
 * Environment Configuration Validator
 *
 * Validates all required environment variables at startup
 * to fail fast and provide clear error messages.
 */

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;

  // MongoDB
  MONGODB_URI: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string | undefined;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;

  // Cloudflare R2
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string | undefined;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvConfig>;
}

/**
 * Required environment variables
 */
const REQUIRED_VARS = [
  'MONGODB_URI',
  'REDIS_HOST',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS: Record<string, string | number> = {
  NODE_ENV: 'development',
  PORT: 3000,
  FRONTEND_URL: 'http://localhost:5173',
  REDIS_PORT: 6379,
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
};

/**
 * Validate a single environment variable
 */
function validateVar(name: string, value: string | undefined): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${name} is required but not set` };
  }

  // Specific validations
  if (name === 'MONGODB_URI' && !value.startsWith('mongodb')) {
    return { valid: false, error: `${name} must be a valid MongoDB connection string` };
  }

  if (name === 'PORT') {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: `${name} must be a valid port number (1-65535)` };
    }
  }

  if (name === 'REDIS_PORT') {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: `${name} must be a valid port number (1-65535)` };
    }
  }

  if ((name === 'JWT_SECRET' || name === 'REFRESH_TOKEN_SECRET') && value.length < 32) {
    return { valid: false, error: `${name} should be at least 32 characters for security` };
  }

  return { valid: true };
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Partial<EnvConfig> = {};

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    const validation = validateVar(varName, value);

    if (!validation.valid) {
      errors.push(validation.error!);
    } else {
      (config as any)[varName] = value;
    }
  }

  // Check optional variables and apply defaults
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      (config as any)[varName] = defaultValue;
      if (varName !== 'NODE_ENV') {
        warnings.push(`${varName} not set, using default: ${defaultValue}`);
      }
    } else {
      // Parse numeric values
      if (typeof defaultValue === 'number') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          warnings.push(`${varName} is not a valid number, using default: ${defaultValue}`);
          (config as any)[varName] = defaultValue;
        } else {
          (config as any)[varName] = numValue;
        }
      } else {
        (config as any)[varName] = value;
      }
    }
  }

  // Check for weak secrets in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET || '';
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || '';

    if (jwtSecret.length < 64) {
      warnings.push('JWT_SECRET should be at least 64 characters in production');
    }

    if (refreshSecret.length < 64) {
      warnings.push('REFRESH_TOKEN_SECRET should be at least 64 characters in production');
    }

    if (jwtSecret === refreshSecret) {
      warnings.push('JWT_SECRET and REFRESH_TOKEN_SECRET should be different');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Load and validate environment, exit on critical errors
 */
export function loadEnvironment(): EnvConfig {
  const result = validateEnvironment();

  // Print header
  console.log('\n' + '='.repeat(50));
  console.log('Environment Validation');
  console.log('='.repeat(50));

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((w) => console.log(`   - ${w}`));
  }

  // Print errors and exit if invalid
  if (!result.isValid) {
    console.log('\n❌ Errors:');
    result.errors.forEach((e) => console.log(`   - ${e}`));
    console.log('\n' + '='.repeat(50));
    console.log('Please set the required environment variables and restart.');
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  }

  console.log('\n✅ Environment validated successfully');
  console.log('='.repeat(50) + '\n');

  return result.config as EnvConfig;
}

/**
 * Get a required environment variable (throws if not set)
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Get a numeric environment variable
 */
export function getNumericEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export default {
  validateEnvironment,
  loadEnvironment,
  getRequiredEnv,
  getOptionalEnv,
  getNumericEnv,
};
