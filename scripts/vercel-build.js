const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.RENDER_API_URL || 'https://moviesoko-api.onrender.com').replace(/\/$/, '');
const out = path.join(__dirname, '../frontend/config.js');

fs.writeFileSync(
  out,
  `// Auto-generated for Vercel deploy — do not edit\nwindow.CINE254_API = '${apiUrl}';\n`
);

console.log(`Wrote config.js → API: ${apiUrl || '(same origin)'}`);
