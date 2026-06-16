const fs = require('fs');
const path = require('path');

const DEFAULT_API = 'https://moviesoko-api.onrender.com';

function sanitizeApiUrl(raw) {
  if (!raw) return DEFAULT_API;

  let v = String(raw).trim();

  // User pasted "RENDER_API_URL=https://..." as the value in Vercel
  if (/^RENDER_API_URL=/i.test(v)) {
    v = v.replace(/^RENDER_API_URL=/i, '').trim();
  }

  v = v.replace(/\/$/, '');

  if (!/^https?:\/\//i.test(v)) {
    console.warn(`Invalid RENDER_API_URL "${raw}" — using ${DEFAULT_API}`);
    return DEFAULT_API;
  }

  return v;
}

const apiUrl = sanitizeApiUrl(process.env.RENDER_API_URL);
const out = path.join(__dirname, '../frontend/config.js');

fs.writeFileSync(
  out,
  `// Auto-generated for Vercel deploy — do not edit
(function () {
  var raw = '${apiUrl.replace(/'/g, "\\'")}';
  var url = raw.replace(/^RENDER_API_URL=/i, '').trim();
  if (!/^https?:\\/\\//i.test(url)) url = '${DEFAULT_API}';
  window.CINE254_API = url.replace(/\\/$/, '');
})();
`
);

console.log(`Wrote config.js → API: ${apiUrl}`);
