export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) { statusCode = err.statusCode; message = err.message; }
  if (err.name === 'ValidationError') { statusCode = 400; message = err.message; }
  if (err.name === 'CastError') { statusCode = 400; message = 'Invalid ID format'; }
  if (err.code === 11000) { statusCode = 409; message = 'Duplicate entry'; }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  console.error(`[ERROR] ${statusCode} - ${req.method} ${req.path}:`, message);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
