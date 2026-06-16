// API base — empty = same origin (local dev + Render full-stack)
// Vercel build can override via RENDER_API_URL; fallback detects Vercel hostname
(function () {
  if (window.CINE254_API) return;

  var host = location.hostname;
  var isVercel = host.endsWith('.vercel.app') || host.includes('moviesoko');
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  if (isVercel && !isLocal) {
    window.CINE254_API = 'https://moviesoko-api.onrender.com';
  } else {
    window.CINE254_API = '';
  }
})();
