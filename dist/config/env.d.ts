/**
 * Environment Configuration Validator
 *
 * Validates all required environment variables at startup
 * to fail fast and provide clear error messages.
 */
interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    FRONTEND_URL: string;
    MONGODB_URI: string;
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD: string | undefined;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    REFRESH_TOKEN_SECRET: string;
    REFRESH_TOKEN_EXPIRES_IN: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string | undefined;
}
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: Partial<EnvConfig>;
}
/**
 * Validate all environment variables
 */
export declare function validateEnvironment(): ValidationResult;
/**
 * Load and validate environment, exit on critical errors
 */
export declare function loadEnvironment(): EnvConfig;
/**
 * Get a required environment variable (throws if not set)
 */
export declare function getRequiredEnv(name: string): string;
/**
 * Get an optional environment variable with a default value
 */
export declare function getOptionalEnv(name: string, defaultValue: string): string;
/**
 * Get a numeric environment variable
 */
export declare function getNumericEnv(name: string, defaultValue: number): number;
declare const _default: {
    validateEnvironment: typeof validateEnvironment;
    loadEnvironment: typeof loadEnvironment;
    getRequiredEnv: typeof getRequiredEnv;
    getOptionalEnv: typeof getOptionalEnv;
    getNumericEnv: typeof getNumericEnv;
};
export default _default;
//# sourceMappingURL=env.d.ts.map