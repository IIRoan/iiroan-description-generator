require('dotenv').config();
const express = require('express');
const githubReadme = require('./api/github-readme');

const app = express();
const PORT = process.env.PORT || 3000;
let requestCount = 0; // Counter for total requests received this deployment

// Structured logging function to normalize logs
const log = (level, message, details = {}) => {
  console.log(JSON.stringify({ level, msg: message, ...details }));
};

// Simple route for the GitHub README image
app.get('/api/github-readme', (req, res) => {
  requestCount += 1;
  const clientIp = req.ip; // Get client's IP address
  log('info', 'Received request for /api/github-readme', { path: req.path, method: req.method, clientIp, requestCount });

  try {
    githubReadme(req, res);
    log('info', 'Successfully processed /api/github-readme request', { path: req.path, clientIp, requestCount });
  } catch (error) {
    log('error', 'Error handling /api/github-readme', { error: error.message, stack: error.stack, clientIp, requestCount });
    res.status(500).send('An error occurred while processing the request.');
  }
});

// Start server
app.listen(PORT, () => {
  log('info', `Server is running on http://localhost:${PORT}`, { port: PORT });
});
