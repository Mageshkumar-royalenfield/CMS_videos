const winston = require('winston');

// Define different log levels (npm levels are standard)
const levels = {
  error: 0, // Most critical
  warn: 1,
  info: 2,
  http: 3,  // For HTTP request logs (Morgan)
  verbose: 4,
  debug: 5,
  silly: 6   // Least critical
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn'; // More verbose in dev, less in prod
};

// Define colors for different log levels (optional, for console readability)
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};
winston.addColors(colors);

const IS_PROD = process.env.NODE_ENV === 'production';

// Define the format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: IS_PROD ? undefined : true }), // Show stack in dev, not in prod JSON log by default for brevity
  winston.format.splat(), // Enables string interpolation
  IS_PROD ? winston.format.json() : winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? '\n' + info.stack : ''}`)
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(), // Add colors to console output
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? '\n' + info.stack : ''}`)
);


// Define transports (where logs should go)
const transports = [
  // Always log to the console
  new winston.transports.Console({
    format: IS_PROD ? logFormat : consoleFormat, // Use simpler colored format for dev console
  }),
];

// In production, you might want to log to files or a logging service
if (IS_PROD) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error', // Only log errors to this file
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log', // All logs (warn and above)
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
} else {
  // Development: more detailed file logs if needed
   transports.push(
    new winston.transports.File({
      filename: 'logs/dev-debug.log',
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 2,
    })
  );
}


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || level(), // Use LOG_LEVEL from .env or determine by NODE_ENV
  levels,
  format: logFormat,
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

module.exports = logger;