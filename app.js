// Core Imports
const express = require('express');
require('dotenv').config(); // Ensure dotenv is configured early

// Security, Performance, and Utility Middlewares
const morgan = require('morgan'); // HTTP request logger
const helmet = require('helmet'); // Security headers
const compression = require('compression'); // Response compression
const rateLimit = require('express-rate-limit'); // Basic rate limiting
const cors = require('cors'); // Cross-Origin Resource Sharing

// Custom Utilities and Routes
const videoRoutes = require('./src/routes/videoRoutes');
const AppError = require('./src/utils/AppError');
const globalErrorHandler = require('./src/utils/errorHandler'); // Renamed for clarity
const logger = require('./src/utils/logger'); // Assuming you'll create this

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

// --- Pre-Route Middlewares ---
app.use(helmet());
app.use(cors());
if (IS_PROD) {
  app.set('trust proxy', 1);
}
const morganFormat = IS_PROD ? 'combined' : 'dev';
// Integrate Morgan with Winston for unified logging
const stream = {
  write: (message) => logger.http(message.trim()), // Use Winston's http level
};
app.use(morgan(morganFormat, { stream }));


// Body Parsers
// Handles `application/x-www-form-urlencoded`
app.use(express.urlencoded({ extended: true }));
// Handles `application/json`
app.use(express.json({ limit: '10kb' })); // Limit payload size for security

// Gzip compression for responses
app.use(compression());

// Rate Limiting - to prevent attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PROD ? 100 : 1000, // Max requests per IP per windowMs (adjust as needed)
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  handler: (req, res, next, options) => { // Custom handler to log and use AppError
    logger.warn(`Rate limit exceeded for IP ${req.ip}: ${options.message}`);
    next(new AppError(options.message, options.statusCode));
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter); // Apply to all routes under /api or globally: app.use(limiter);

// --- Application Routes ---
// It's good practice to prefix API routes, e.g., /api/v1
app.use(videoRoutes); // Example prefixing
// If videoRoutes doesn't have its own /api/v1 prefix, this is how you'd do it.
// If it does, then just app.use(videoRoutes); is fine.

// --- Post-Route Middlewares (Error Handling) ---

// 404 Handler for undefined routes
// This middleware is reached only if no prior route handler has responded.
app.use(function(req, res, next) {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error-Handling Middleware
// This must be the last `app.use()` call and have 4 arguments.
app.use(globalErrorHandler);

// --- Graceful Shutdown ---
// Handles process termination signals to allow for cleanup.
const gracefulShutdown = (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  // server.close(() => {
  //   logger.info('HTTP server closed.');
  //   // Add any other cleanup tasks here (e.g., database connections)
  //   // mongoose.connection.close(false, () => {
  //   //   logger.info('MongoDB connection closed.');
  //   //   process.exit(0);
  //   // });
  //   process.exit(0); // Exit after server and other resources are closed
  // });

  // If server hasn't finished in a timeout period, force shut down
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Common signal for termination (e.g., from Docker, Kubernetes)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C in terminal

// Handle Unhandled Rejections and Uncaught Exceptions (should be rare with good error handling)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { reason, promise });
  // Optionally, close server and exit (might be too aggressive for some apps)
  // server.close(() => {
  //   process.exit(1);
  // });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  // For uncaught exceptions, it's generally recommended to exit,
  // as the application might be in an inconsistent state.
  process.exit(1); // Mandatory exit after uncaught exception
});

module.exports = app;