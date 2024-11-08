require('dotenv').config();
const express = require('express');
const githubReadme = require('./api/github-readme');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/github-readme', githubReadme);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
