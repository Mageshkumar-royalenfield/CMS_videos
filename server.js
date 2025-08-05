require('dotenv').config();
const app = require('./app');
const port = process.env.PORT ? process.env.PORT : 8000;
const logger = require('./src/utils/logger'); // Assuming you'll create this

// --- Server Startup ---
app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode.`);
  logger.info(`Log level set to: ${logger.level}`);
});