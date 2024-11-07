// Full code with centering adjustments
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function escapeXML(str) {
  return str.replace(/[&<>'"]/g, function (char) {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
    }
  });
}

module.exports = async (req, res) => {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // GitHub API headers with authentication
    const headers = {
      Authorization: `token ${GITHUB_TOKEN}`,
    };

    // Fetch data from GitHub API
    const userData = await axios.get('https://api.github.com/users/IIRoan', { headers });
    const reposData = await axios.get('https://api.github.com/users/IIRoan/repos?per_page=100', { headers });

    const data = userData.data;
    const repos = reposData.data;

    // Fetch the avatar image and convert it to base64
    const avatarResponse = await axios.get(data.avatar_url, {
      responseType: 'arraybuffer',
      headers,
    });
    const avatarBase64 = Buffer.from(avatarResponse.data, 'binary').toString('base64');

    // Determine the content type of the image
    const avatarMimeType = avatarResponse.headers['content-type'] || 'image/png';

    // Fetch languages for each repo
    let languageBytes = {};

    await Promise.all(
      repos.map(async (repo) => {
        const langData = await axios.get(repo.languages_url, { headers });
        for (let [lang, bytes] of Object.entries(langData.data)) {
          if (languageBytes[lang]) {
            languageBytes[lang] += bytes;
          } else {
            languageBytes[lang] = bytes;
          }
        }
      })
    );

    // Calculate total bytes
    const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);

    // Convert to percentages and sort languages
    let languages = Object.entries(languageBytes)
      .map(([lang, bytes]) => {
        return {
          name: lang,
          percentage: ((bytes / totalBytes) * 100).toFixed(2),
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 languages

    // Define colors for languages
    const languageColors = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      'C#': '#178600',
      HTML: '#e34c26',
      CSS: '#563d7c',
    };

    // Create language bars and center them
    let languageBars = '';
    let yOffset = 15;
    languages.forEach((lang, index) => {
      const barWidth = lang.percentage * 2;
      const color = languageColors[lang.name] || '#ccc';

      languageBars += `
        <rect x="350" y="${250 + yOffset}" width="${barWidth}" height="20" fill="${color}" rx="5" ry="5" />
        <text x="350" y="${245 + yOffset}" font-size="14" fill="#ebdbb2" font-family="Segoe UI, Ubuntu, Sans-Serif">${lang.name} (${lang.percentage}%)</text>
      `;
      yOffset += 45;
    });

    // Read nessie.png as a Base64 encoded string
    const nessiePath = path.join(__dirname, 'nessie.png');
    const nessieBase64 = fs.readFileSync(nessiePath).toString('base64');

    // Standardized SVG Icons from Feather Icons (https://feathericons.com/)
    const iconSize = 24;
    const iconPadding = 10;
    const icons = [
      {
        href: data.html_url,
        x: 360,
        y: 140,
        svg: `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3
              m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61
              c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77
              A5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48
              a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1
              A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78
              c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22">
            </path>
          </svg>
        `,
      },
      {
        href: 'https://roan.dev',
        x: 400,
        y: 140,
        svg: `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10
              15.3 15.3 0 0 1-4 10
              15.3 15.3 0 0 1-4-10
              15.3 15.3 0 0 1 4-10z">
            </path>
          </svg>
        `,
      },
      {
        href: 'mailto:git@lunary.roan.zip',
        x: 440,
        y: 140,
        svg: `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12
              c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6
              c0-1.1.9-2 2-2z">
            </path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        `,
      },
    ];

    // Create social icons with larger clickable areas and center them
    let socialIcons = '';
    icons.forEach((icon) => {
      socialIcons += `
        <a xlink:href="${icon.href}" target="_blank">
          <rect x="${icon.x - iconPadding}" y="${icon.y - iconPadding}" width="${iconSize + iconPadding * 2}" height="${iconSize + iconPadding * 2}" fill="transparent" />
          ${icon.svg.replace('<svg ', `<svg x="${icon.x}" y="${icon.y}" `)}
        </a>
      `;
    });

    // Generate SVG content
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <!-- Background Gradient -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1d2021;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#32302f;stop-opacity:1" />
          </linearGradient>

          <!-- Shadow Filter -->
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#000" flood-opacity="0.5"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="800" height="600" fill="url(#bgGradient)" />

        <!-- Background Avatar Image with Shadow and Transparency -->
        <g filter="url(#shadow)">
          <image x="0" y="0" width="800" height="600" href="data:${avatarMimeType};base64,${avatarBase64}" opacity="0.1" preserveAspectRatio="xMidYMid slice"/>
        </g>

        <!-- Name and Title -->
        <text x="50%" y="80" class="name" text-anchor="middle">${escapeXML(data.name || data.login)}</text>
        <text x="50%" y="110" class="title" text-anchor="middle">${escapeXML(data.bio || 'Software Developer, DevOps')}</text>

        <!-- Centered Social Icons -->
        <g>
          ${socialIcons}
        </g>

        <!-- Stats -->
        <text x="50%" y="200" class="stats" text-anchor="middle">Followers: ${data.followers} | Following: ${data.following} | Public Repos: ${data.public_repos}</text>

        <!-- Most Used Languages -->
        <text x="50%" y="230" class="section-title" text-anchor="middle">Most Used Languages:</text>
        <!-- Centered Language Bars -->
        <g transform="translate(0, 0)">
          ${languageBars}
        </g>

        <!-- Nessie Image and Text -->
        <image x="700" y="520" width="80" height="80" href="data:image/png;base64,${nessieBase64}" />
        <text x="490" y="500" font-size="14" fill="#ebdbb2" font-family="Segoe UI, Ubuntu, Sans-Serif" transform="rotate(-30 690,350)">Check out my projects underneath!</text>

        <!-- Styles -->
        <style>
          .name {
            font: bold 30px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: #fabd2f;
          }
          .title {
            font: 20px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: #83a598;
          }
          .stats {
            font: 16px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: #ebdbb2;
          }
          .section-title {
            font: bold 18px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: #fe8019;
          }
          text {
            font-family: 'Segoe UI', Ubuntu, Sans-Serif;
          }
          a {
            text-decoration: none;
          }
          svg {
            overflow: hidden;
          }
        </style>
      </svg>
    `;

    // Set content type to SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache'); // Prevent caching
    res.send(svg);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating SVG');
  }
};
