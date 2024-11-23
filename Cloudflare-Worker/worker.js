// worker.js

// Helper function to escape XML characters
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
  
  // Helper function to convert ArrayBuffer to Base64
  function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  // Main handler function
  export default {
    async fetch(request, env, ctx) {
      try {
        const url = new URL(request.url);
        if (url.pathname === '/') {
          return handleGithubReadme(request, env);
        } else {
          return new Response('Not Found', { status: 404 });
        }
      } catch (err) {
        console.error(err);
        return new Response('Internal Server Error', { status: 500 });
      }
    }
  }
  
  async function handleGithubReadme(request, env) {
    try {
      const GITHUB_TOKEN = env.GITHUB_TOKEN;
      const GITHUB_USERNAME = env.GITHUB_USERNAME;
  
      // GitHub API headers with authentication
      const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker/1.0'
      };
  
      // Fetch data from GitHub API
      const [userDataResponse, reposDataResponse, eventsDataResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, { headers }),
        fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, { headers }),
        fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events`, { headers }),
      ]);
  
      if (!userDataResponse.ok || !reposDataResponse.ok || !eventsDataResponse.ok) {
        throw new Error('Error fetching data from GitHub API');
      }
  
      const data = await userDataResponse.json();
      const repos = await reposDataResponse.json();
      const events = await eventsDataResponse.json();
  
      // Fetch the avatar image and convert it to base64
      const avatarResponse = await fetch(data.avatar_url);
      const avatarArrayBuffer = await avatarResponse.arrayBuffer();
      const avatarBase64 = arrayBufferToBase64(avatarArrayBuffer);
  
      // Determine the content type of the image
      const avatarMimeType = avatarResponse.headers.get('content-type') || 'image/png';
  
      // Fetch languages for each repo
      let languageBytes = {};
  
      await Promise.all(
        repos.map(async (repo) => {
          const langResponse = await fetch(repo.languages_url, { headers });
          if (langResponse.ok) {
            const langData = await langResponse.json();
            for (let [lang, bytes] of Object.entries(langData)) {
              if (languageBytes[lang]) {
                languageBytes[lang] += bytes;
              } else {
                languageBytes[lang] = bytes;
              }
            }
          } else {
            console.warn(`Failed to fetch languages for repo ${repo.name}`);
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
        'JavaScript': '#f1e05a',
        'TypeScript': '#2b7489',
        'Python': '#3572A5',
        'C#': '#178600',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Shell': '#89e051',
      };
  
      // Read colors for text elements and language text from env with default values
      const colors = {
        nameFillColor: env.NAME_FILL_COLOR || '#4B8B9B',
        titleFillColor: env.TITLE_FILL_COLOR || '#AB83CD',
        statsFillColor: env.STATS_FILL_COLOR || '#B0C4DE',
        sectionTitleFillColor: env.SECTION_TITLE_FILL_COLOR || '#6A5ACD',
        languageTextColor: env.LANGUAGE_TEXT_COLOR || '#B0C4DE'
      };
  
      // Create language bars with configurable text color
      let languageBars = '';
      let yOffset = 15;
      languages.forEach((lang) => {
        const barWidth = lang.percentage * 2;
        const color = languageColors[lang.name] || '#ccc';
  
        languageBars += `
          <rect x="60" y="${250 + yOffset}" width="${barWidth}" height="20" fill="${color}" rx="5" ry="5" />
          <text x="60" y="${245 + yOffset}" font-size="14" fill="${colors.languageTextColor}" font-family="Segoe UI, Ubuntu, Sans-Serif">${lang.name} (${lang.percentage}%)</text>
        `;
        yOffset += 45;
      });
  
      // Handle Nessie Image
      let nessieImage = '';
      const showNessie = env.SHOW_NESSIE_IMAGE !== 'false'; // Default to true
      if (showNessie && env.NESSIE_BASE64) {
        const nessieBase64 = env.NESSIE_BASE64;
        nessieImage = `
          <!-- Nessie Image -->
          <image x="850" y="550" width="60" height="60" href="data:image/png;base64,${nessieBase64}" />
        `;
      }
  
      // Read social media links from env
      const githubLink = env.GITHUB_LINK || data.html_url;
      const websiteLink = env.WEBSITE_LINK || '';
      const emailLink = env.EMAIL_LINK || '';
  
      // Standardized SVG Icons from Feather Icons
      const iconSize = 24;
      const iconPadding = 10;
  
      // Prepare the icons data
      const iconsData = [
        {
          href: githubLink,
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
          href: websiteLink,
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
          href: emailLink,
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
  
      // Filter out icons with empty links
      const icons = iconsData.filter((icon) => icon.href && icon.href.trim() !== '');
  
      // Adjust x positions based on the number of icons
      const totalIcons = icons.length;
      const iconSpacing = 40; // Adjust spacing as needed
      const startingX = 60; // Starting x position
  
      icons.forEach((icon, index) => {
        icon.x = startingX + index * iconSpacing;
        icon.y = 140;
      });
  
      // Create social icons with larger clickable areas
      let socialIcons = '';
      icons.forEach((icon) => {
        socialIcons += `
          <a xlink:href="${icon.href}" target="_blank">
            <rect x="${icon.x - iconPadding}" y="${icon.y - iconPadding}" width="${iconSize + iconPadding * 2
          }" height="${iconSize + iconPadding * 2}" fill="transparent" />
            ${icon.svg.replace('<svg ', `<svg x="${icon.x}" y="${icon.y}" `)}
          </a>
        `;
      });
  
      // Fetch user's gists count
      const gistsCount = data.public_gists;
  
      // Calculate contributions in the last year
      const contributionsLastYear = events.filter((event) => {
        const eventDate = new Date(event.created_at);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return eventDate >= oneYearAgo;
      }).length;
  
      // Get top 4 repositories by stargazers_count
      const topRepos = repos
        .filter((repo) => !repo.fork) // Exclude forked repositories
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4);
  
      // Function to truncate text with ellipsis
      function truncateText(text, maxLength) {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + '...';
        }
        return text;
      }
  
      // Read colors for repo section from env or use defaults
      const repoColors = {
        repoNameColor: env.REPO_NAME_COLOR || '#b8bb26',
        repoDescColor: env.REPO_DESC_COLOR || '#ebdbb2',
        repoStatsColor: env.REPO_STATS_COLOR || '#d3869b',
      };
  
      let reposInfo = '';
      let repoYOffset = 0;
      topRepos.forEach((repo) => {
        // Truncate the description to 60 characters
        const truncatedDescription = truncateText(repo.description || '', 60);
  
        reposInfo += `
          <a xlink:href="${repo.html_url}" target="_blank">
            <text x="400" y="${250 + repoYOffset}" font-size="16" fill="${repoColors.repoNameColor}" font-family="Segoe UI, Ubuntu, Sans-Serif">${escapeXML(
          repo.name
        )}</text>
          </a>
          <text x="400" y="${270 + repoYOffset}" font-size="14" fill="${repoColors.repoDescColor}" font-family="Segoe UI, Ubuntu, Sans-Serif">${escapeXML(
          truncatedDescription
        )}</text>
          <text x="400" y="${290 + repoYOffset}" font-size="12" fill="${repoColors.repoStatsColor}" font-family="Segoe UI, Ubuntu, Sans-Serif">★ ${repo.stargazers_count
        } | Forks: ${repo.forks_count}</text>
        `;
        repoYOffset += 60;
      });
  
      // Arrow Down Icon from Feather Icons
      const arrowIconSize = 24;
      const arrowX = (900 - arrowIconSize) / 2; // Centered horizontally
      const arrowY = 550;
  
      const arrowDownSvg = `
        <svg x="${arrowX}" y="${arrowY}" width="${arrowIconSize}" height="${arrowIconSize}" viewBox="0 0 24 24" fill="none" stroke="#ebdbb2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      `;
  
      // Read bio preferences from env
      const useGitHubBio = env.USE_GITHUB_BIO === 'true';
      const bio = useGitHubBio ? (data.bio || '') : (env.BIO || '');
  
      // Read custom background image settings from env
      const showAvatarBackground = env.SHOW_AVATAR_BACKGROUND !== 'false'; // Default to true
      const avatarBackgroundOpacity = parseFloat(env.AVATAR_BACKGROUND_OPACITY) || 0.05;
      const backgroundImageUrl = env.BACKGROUND_IMAGE_URL || '';
  
      // Generate SVG content
      const svg = `
        <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <!-- Background Gradient -->
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1d2021;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#32302f;stop-opacity:1" />
            </linearGradient>
          </defs>
  
          <!-- Background -->
          <rect width="900" height="600" fill="url(#bgGradient)" />
  
          <!-- Custom Background Image -->
          ${backgroundImageUrl
          ? `<image x="0" y="0" width="900" height="600" href="${backgroundImageUrl}" opacity="0.3" preserveAspectRatio="xMidYMid slice"/>`
          : ''
        }
  
          <!-- Background Avatar Image with Transparency -->
          ${showAvatarBackground
          ? `<image x="0" y="0" width="900" height="600" href="data:${avatarMimeType};base64,${avatarBase64}" opacity="${avatarBackgroundOpacity}" preserveAspectRatio="xMidYMid slice"/>`
          : ''
        }
  
          <!-- Name and Title -->
          <text x="60" y="80" class="name">${escapeXML(data.name || data.login)}</text>
          <text x="60" y="110" class="title">${escapeXML(bio)}</text>
  
          <!-- Social Icons -->
          ${socialIcons}
  
          <!-- Stats -->
          <text x="60" y="200" class="stats">
            Followers: ${data.followers} | Following: ${data.following} | Repos: ${data.public_repos} | Gists: ${gistsCount} | Contributions (Last Year): ${contributionsLastYear}
          </text>
  
          <!-- Most Used Languages -->
          <text x="60" y="230" class="section-title">Most Used Languages:</text>
          ${languageBars}
  
          <!-- Top Repositories on the Right -->
          <text x="400" y="230" class="section-title">Top Repositories:</text>
          ${reposInfo}
  
          <!-- Nessie Image -->
          ${nessieImage}
  
          <!-- Downward Arrow Icon -->
          ${arrowDownSvg}
  
          <!-- Styles -->
          <style>
            .name {
              font: bold 30px 'Segoe UI', Ubuntu, Sans-Serif;
              fill: ${colors.nameFillColor};
            }
            .title {
              font: 20px 'Segoe UI', Ubuntu, Sans-Serif;
              fill: ${colors.titleFillColor};
            }
            .stats {
              font: 16px 'Segoe UI', Ubuntu, Sans-Serif;
              fill: ${colors.statsFillColor};
            }
            .section-title {
              font: bold 18px 'Segoe UI', Ubuntu, Sans-Serif;
              fill: ${colors.sectionTitleFillColor};
            }
            text {
              font-family: 'Segoe UI', Ubuntu, Sans-Serif;
            }
            a {
              text-decoration: none;
            }
            svg {
              overflow: visible;
            }
          </style>
        </svg>
      `;
  
      // Return the SVG response
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
  
    } catch (error) {
      console.error(error);
      return new Response('Error generating SVG', { status: 500 });
    }
  }
  