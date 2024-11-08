require('dotenv').config();
const express = require('express');
const githubReadme = require('./api/github-readme');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 8080;
let requestCount = 0; // Counter for total requests received this deployment

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({ timestamp, level, message, ...meta });
        })
      ),
    }),
  ],
});

// Middleware to log HTTP requests with client IP and User-Agent
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Route for the GitHub README image
app.get('/api/github-readme', (req, res) => {
  requestCount += 1;
  try {
    githubReadme(req, res);
    logger.info('Successfully processed /api/github-readme request', {
      path: req.path,
      requestCount,
    });
  } catch (error) {
    logger.error('Error handling /api/github-readme', {
      error: error.message,
      stack: error.stack,
      requestCount,
    });
    res.status(500).send('An error occurred while processing the request.');
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`, { port: PORT });
});
