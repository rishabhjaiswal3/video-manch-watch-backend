"use strict";
/**
 * Environment Configuration Validator
 *
 * Validates all required environment variables at startup
 * to fail fast and provide clear error messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
exports.loadEnvironment = loadEnvironment;
exports.getRequiredEnv = getRequiredEnv;
exports.getOptionalEnv = getOptionalEnv;
exports.getNumericEnv = getNumericEnv;
/**
 * Required environment variables
 */
const REQUIRED_VARS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
];
/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
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
function validateVar(name, value) {
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
function validateEnvironment() {
    const errors = [];
    const warnings = [];
    const config = {};
    // Check required variables
    for (const varName of REQUIRED_VARS) {
        const value = process.env[varName];
        const validation = validateVar(varName, value);
        if (!validation.valid) {
            errors.push(validation.error);
        }
        else {
            config[varName] = value;
        }
    }
    // Check optional variables and apply defaults
    for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
        const value = process.env[varName];
        if (!value || value.trim() === '') {
            config[varName] = defaultValue;
            if (varName !== 'NODE_ENV') {
                warnings.push(`${varName} not set, using default: ${defaultValue}`);
            }
        }
        else {
            // Parse numeric values
            if (typeof defaultValue === 'number') {
                const numValue = parseInt(value, 10);
                if (isNaN(numValue)) {
                    warnings.push(`${varName} is not a valid number, using default: ${defaultValue}`);
                    config[varName] = defaultValue;
                }
                else {
                    config[varName] = numValue;
                }
            }
            else {
                config[varName] = value;
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
            errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different');
        }
    }
    if (process.env.JWT_SECRET && process.env.REFRESH_TOKEN_SECRET) {
        if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
            errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different');
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
function loadEnvironment() {
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
    return result.config;
}
/**
 * Get a required environment variable (throws if not set)
 */
function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}
/**
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(name, defaultValue) {
    const value = process.env[name];
    return value && value.trim() !== '' ? value : defaultValue;
}
/**
 * Get a numeric environment variable
 */
function getNumericEnv(name, defaultValue) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
exports.default = {
    validateEnvironment,
    loadEnvironment,
    getRequiredEnv,
    getOptionalEnv,
    getNumericEnv,
};
//# sourceMappingURL=env.js.map