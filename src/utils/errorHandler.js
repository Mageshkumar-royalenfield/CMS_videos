const logger = require('./logger'); // Import the Winston logger

const sendErrorDev = (err, req, res) => {
  // Log the detailed error for development
  logger.error(`DEV ERROR: ${err.message}`, {
    statusCode: err.statusCode,
    status: err.status,
    error: err, // Full error object
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(err.statusCode).json({
    status: err.status,
    error: err, // Send full error object in development
    message: err.message,
    stack: err.stack, // Send stack trace in development
  });
};

const sendErrorProd = (err, req, res) => {
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn(`PROD OPERATIONAL ERROR: ${err.message}`, {
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      // Do not log err.stack for operational errors unless necessary for context
    });
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // B) Programming or other unknown error: don't leak error details
  // 1. Log error (with more detail for server logs)
  logger.error('PROD UNKNOWN/PROGRAMMING ERROR', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack, // Log stack for debugging on the server
    url: req.originalUrl,
    method: req.method,
  });

  // 2. Send generic message to client
  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong! Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(err, req, res);
  } else { // development or any other non-production environment
    sendErrorDev(err, req, res);
  }
};