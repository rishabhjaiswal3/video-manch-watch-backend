"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.notFoundHandler = exports.asyncHandler = exports.AppError = void 0;
// Custom error class for application errors
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Global error handler middleware
const globalErrorHandler = (err, req, res, _next) => {
    // Default values
    let statusCode = 500;
    let message = 'Internal server error';
    let isOperational = false;
    // Handle AppError (our custom errors)
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
    }
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
        isOperational = true;
    }
    // Handle Mongoose cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        isOperational = true;
    }
    // Handle Mongoose duplicate key errors
    if (err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
        isOperational = true;
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        isOperational = true;
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        isOperational = true;
    }
    // Log error
    const logLevel = isOperational ? 'warn' : 'error';
    console[logLevel](`[ERROR] ${statusCode} - ${message}`, {
        path: req.path,
        method: req.method,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    // Send response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
        }),
    });
};
exports.globalErrorHandler = globalErrorHandler;
//# sourceMappingURL=errorHandler.js.map