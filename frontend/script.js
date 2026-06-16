const API_BASE = window.CINE254_API || '';
const API = `${API_BASE}/api/movies`;
const ANALYTICS = `${API_BASE}/api/analytics`;
const KEYS = {
  watchlist: 'cine254_watchlist',
  watched: 'cine254_watched',
  reviews: 'cine254_reviews',
  lite: 'cine254_lite',
};

let heroes = [];
let heroIndex = 0;
let heroTimer = null;
let featuredMovie = null;
let currentMovie = null;
let reviewStars = 0;

let watchlist = JSON.parse(localStorage.getItem(KEYS.watchlist) || '[]');
let watched = JSON.parse(localStorage.getItem(KEYS.watched) || '[]');
let reviews = JSON.parse(localStorage.getItem(KEYS.reviews) || '{}');
let liteMode = localStorage.getItem(KEYS.lite) === 'true';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let allRows = {};
let authMode = 'login';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  applyLiteMode();
  updateAuthUI();
  bindEvents();
  initHolographicCards();
  showSkeletons();
  populateGenreFilter();
  loadKenyaTop10();
  loadCreatorContent();

  try {
    const res = await fetch(`${API}/home`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(`API returned ${res.status} — check RENDER_API_URL or redeploy Vercel`);
    }
    const data = await res.json();

    heroes = data.heroes?.length ? data.heroes : (data.featured ? [data.featured] : []);
    featuredMovie = data.featured || heroes[0];
    allRows = data.rows || {};

    if (heroes.length) {
      renderHero(heroes[0], 0);
      startHeroRotation();
    }

    renderRows(allRows);
    $('#skeletonRows').classList.add('hidden');
    $('#movieRows').classList.remove('hidden');
    hideLoader();
  } catch (err) {
    console.error(err);
    hideLoader();
    $('#skeletonRows').classList.add('hidden');
    $('#movieRows').classList.remove('hidden');
    $('#movieRows').innerHTML = `<p style="padding:2rem 4%;color:var(--muted)">Start the server and add TMDB_API_KEY to .env</p>`;
  }

  updateWatchlistUI();
  window.addEventListener('scroll', () => {
    $('#navbar').classList.toggle('scrolled', window.scrollY > 60);
  });
}

function bindEvents() {
  $('#searchBtn').addEventListener('click', () => handleSearch());
  searchInputEvents();
  $('#heroPlayBtn').addEventListener('click', () => featuredMovie && openDetail(featuredMovie.id, true));
  $('#heroInfoBtn').addEventListener('click', () => featuredMovie && openDetail(featuredMovie.id));
  $('#heroWatchlistBtn').addEventListener('click', () => featuredMovie && toggleWatchlist(featuredMovie));
  $('#detailBack').addEventListener('click', closeDetail);
  $('#detailPlayBtn').addEventListener('click', toggleDetailTrailer);
  $('#watchlistBtn').addEventListener('click', () => togglePanel('watchlistPanel'));
  $('#loginBtn').addEventListener('click', () => {
    if (Auth.isLoggedIn()) { renderProfile('watchlist'); togglePanel('profilePanel'); }
    else openModal('authModal');
  });
  $('#notifyBtn').addEventListener('click', () => Auth.subscribePush().then((ok) => alert(ok ? 'Subscribed to new releases!' : 'Push not configured yet')));
  $$('.modal-close').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.modal)));
  $('#authToggle').addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });
  $('#authSubmit').addEventListener('click', handleAuth);
  $('#detailMpesaBtn').addEventListener('click', openMpesaModal);
  $('#mpesaSubmit').addEventListener('click', handleMpesaPay);
  $('#filterAll').addEventListener('click', () => applyRowFilter('all'));
  $('#filterFree').addEventListener('click', () => applyRowFilter('free'));
  $('#filterAfrican').addEventListener('click', () => applyRowFilter('african'));
  $('#filterKenya').addEventListener('click', () => applyRowFilter('kenya'));
  $$('.panel-close').forEach((b) => b.addEventListener('click', () => $(`#${b.dataset.panel}`).classList.add('hidden')));
  $('#liteMode').addEventListener('change', (e) => {
    liteMode = e.target.checked;
    localStorage.setItem(KEYS.lite, liteMode);
    applyLiteMode();
  });

  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToRow(link.getAttribute('href').slice(1));
      $$('.nav-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  $$('.profile-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.profile-tabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderProfile(tab.dataset.tab);
    });
  });

  $$('#reviewStars button').forEach((btn) => {
    btn.addEventListener('click', () => {
      reviewStars = parseInt(btn.dataset.star, 10);
      $$('#reviewStars button').forEach((b, i) => b.classList.toggle('active', i < reviewStars));
    });
  });

  $('#submitReview').addEventListener('click', submitReview);
}

function searchInputEvents() {
  const input = $('#searchInput');
  input.addEventListener('focus', () => $('#searchFilters').classList.remove('hidden'));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
  input.addEventListener('input', debounce(() => {
    if (input.value.trim().length >= 2) handleSearch();
    else $('#searchResults').classList.add('hidden');
  }, 300));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      $('#searchResults').classList.add('hidden');
      $('#searchFilters').classList.add('hidden');
    }
  });
}

function applyLiteMode() {
  document.body.classList.toggle('lite-mode', liteMode);
  $('#liteMode').checked = liteMode;
}

function initHolographicCards() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.movie-card:hover').forEach((card) => {
      const rect = card.getBoundingClientRect();
      const angle = Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * (180 / Math.PI) + 90;
      card.style.setProperty('--holo-angle', `${angle}deg`);
    });
  });
}

function showSkeletons() {
  const container = $('#skeletonRows');
  container.innerHTML = Array(4).fill('').map(() => `
    <div class="skeleton-row">
      <div class="skeleton-title"></div>
      <div class="skeleton-cards">${Array(6).fill('<div class="skeleton-card"></div>').join('')}</div>
    </div>`).join('');
}

async function populateGenreFilter() {
  try {
    const res = await fetch(`${API}/genres`);
    const { genres } = await res.json();
    const sel = $('#filterGenre');
    genres.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
}

function scoreHtml(movie) {
  const parts = [];
  if (movie.imdbRating) parts.push(`<span class="score-pill score-imdb">IMDb ${movie.imdbRating}</span>`);
  else if (movie.rating) parts.push(`<span class="score-pill score-tmdb">★ ${movie.rating.toFixed(1)}</span>`);
  if (movie.rtCritic) parts.push(`<span class="score-pill score-rt">🍅 ${movie.rtCritic}</span>`);
  if (movie.rtAudience) parts.push(`<span class="score-pill score-rt audience">👥 ${movie.rtAudience}</span>`);
  return parts.join('');
}

function cardScoresHtml(movie) {
  const parts = [];
  if (movie.imdbRating) parts.push(`<span class="card-score imdb">${movie.imdbRating}</span>`);
  else if (movie.rating) parts.push(`<span class="card-score">★${movie.rating.toFixed(1)}</span>`);
  if (movie.rtCritic) parts.push(`<span class="card-score rt">${movie.rtCritic}</span>`);
  return parts.join('');
}

function renderHero(movie, index) {
  featuredMovie = movie;
  heroIndex = index;

  const backdrop = movie.backdrop || movie.poster;
  if (backdrop) $('#heroSlides').style.backgroundImage = `url(${backdrop})`;

  $('#heroTitle').textContent = movie.title;
  $('#heroOverview').textContent = movie.overview || '';
  $('#heroRatings').innerHTML = scoreHtml(movie);
  $('#heroYear').textContent = movie.releaseDate?.split('-')[0] || '';
  $('#heroFree').classList.toggle('hidden', !movie.isFree);
  $('#heroBadge').textContent = index === 0 ? '🇰🇪 Trending in Kenya' : '🔥 Featured';

  const dots = $('#heroDots');
  dots.innerHTML = heroes.map((_, i) =>
    `<button class="hero-dot ${i === index ? 'active' : ''}" data-i="${i}"></button>`
  ).join('');
  dots.querySelectorAll('.hero-dot').forEach((d) => {
    d.addEventListener('click', () => {
      heroIndex = parseInt(d.dataset.i, 10);
      renderHero(heroes[heroIndex], heroIndex);
      resetHeroTimer();
    });
  });
}

function startHeroRotation() {
  if (heroes.length < 2) return;
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % heroes.length;
    renderHero(heroes[heroIndex], heroIndex);
  }, 8000);
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  startHeroRotation();
}

function renderRows(rows) {
  const container = $('#movieRows');
  container.innerHTML = '';

  const order = [
    'kenya_trending', 'free', 'trending', 'new', 'african', 'top_rated',
    'popular', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sci-fi', 'thriller',
  ];

  const flags = { kenya_trending: '🇰🇪', free: '💸', african: '🌍' };

  for (const key of order) {
    const row = rows[key];
    if (!row?.movies?.length) continue;

    const section = document.createElement('section');
    section.className = 'movie-row';
    section.id = key;
    section.dataset.row = key;

    section.innerHTML = `
      <div class="row-header">
        ${flags[key] ? `<span class="row-flag">${flags[key]}</span>` : ''}
        <h2>${row.title}</h2>
      </div>
      <div class="row-scroll"></div>`;

    const scroll = section.querySelector('.row-scroll');
    row.movies.forEach((m) => scroll.appendChild(createMovieCard(m)));
    container.appendChild(section);
  }
}

function posterSrc(movie) {
  if (!movie.poster) return null;
  if (liteMode) return movie.poster.replace('/w500', '/w342');
  return movie.poster;
}

function createMovieCard(movie) {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.dataset.id = movie.id;

  const src = posterSrc(movie);
  const poster = src
    ? `<img class="card-poster" src="${src}" alt="${escapeHtml(movie.title)}" loading="lazy" />`
    : '';

  const preview = (!liteMode && movie.trailerKey)
    ? `<div class="card-preview"><iframe src="https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&mute=1&controls=0&rel=0" loading="lazy"></iframe></div>`
    : '';

  const watchOn = (movie.watchOn || []).slice(0, 2).map((p) => `<span class="card-tag">${escapeHtml(p)}</span>`).join('');
  const freeTag = movie.isFree ? '<span class="card-tag free">FREE</span>' : '';

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-poster-wrap">
        ${poster || '<div class="card-placeholder">🎬</div>'}
        ${preview}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(movie.title)}</div>
        <div class="card-scores">${cardScoresHtml(movie)}</div>
        <div class="card-tags">${freeTag}${watchOn}</div>
        <div class="card-actions">
          <button class="card-btn play-btn">▶</button>
          <button class="card-btn secondary save-btn">${watchlist.some((w) => w.id === movie.id) ? '✓' : '+'}</button>
        </div>
      </div>
    </div>`;

  card.querySelector('.play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    trackAnalytics(movie.id, 'clicks');
    openDetail(movie.id);
  });

  card.querySelector('.save-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWatchlist(movie);
    e.target.textContent = watchlist.some((w) => w.id === movie.id) ? '✓' : '+';
  });

  card.addEventListener('mouseenter', () => trackAnalytics(movie.id, 'clicks'));
  card.addEventListener('click', () => { trackAnalytics(movie.id, 'clicks'); openDetail(movie.id); });

  return card;
}

async function openDetail(id, playTrailer = false) {
  $('#mainView').classList.add('hidden');
  $('#detailView').classList.remove('hidden');
  window.scrollTo(0, 0);
  trackAnalytics(id, 'clicks');

  try {
    const res = await fetch(`${API}/${id}`);
    const { movie } = await res.json();
    currentMovie = movie;
    renderDetail(movie, playTrailer);
  } catch {
    alert('Failed to load details');
    closeDetail();
  }
}

function renderDetail(movie, playTrailer = false) {
  $('#detailTitle').textContent = movie.title;
  $('#detailTagline').textContent = movie.tagline || '';
  $('#detailOverview').textContent = movie.overview || '';
  $('#detailRatingsBar').innerHTML = scoreHtml(movie);
  $('#detailYear').textContent = movie.releaseDate?.split('-')[0] || '';
  $('#detailRuntime').textContent = movie.runtime ? `${movie.runtime} min` : '';
  $('#detailFree').classList.toggle('hidden', !movie.isFree);

  if (movie.poster) {
    $('#detailPoster').src = posterSrc(movie) || movie.poster;
    $('#detailPoster').alt = movie.title;
  }

  const backdrop = movie.backdrop || movie.poster;
  if (backdrop) $('#detailBackdrop').style.backgroundImage = `url(${backdrop})`;

  $('#detailGenres').innerHTML = (movie.genres || [])
    .map((g) => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('');

  const awardsEl = $('#detailAwards');
  if (movie.awards) {
    awardsEl.textContent = `🏆 ${movie.awards}`;
    awardsEl.classList.remove('hidden');
  } else awardsEl.classList.add('hidden');

  const trailerEl = $('#detailTrailer');
  if (movie.trailerKey) {
    $('#trailerFrame').src = playTrailer
      ? `https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&rel=0`
      : '';
    trailerEl.classList.toggle('hidden', !playTrailer);
  } else {
    trailerEl.classList.add('hidden');
    $('#trailerFrame').src = '';
  }

  const castSection = $('#castSection');
  const castList = $('#castList');
  if (movie.cast?.length) {
    castList.innerHTML = movie.cast.map((c) => `
      <div class="cast-card">
        ${c.profile ? `<img src="${c.profile}" alt="${escapeHtml(c.name)}" loading="lazy" />` : '<div style="width:80px;height:80px;border-radius:50%;background:#222;margin:0 auto 0.4rem"></div>'}
        <div class="cast-name">${escapeHtml(c.name)}</div>
        <div class="cast-role">${escapeHtml(c.character)}</div>
      </div>`).join('');
    castSection.classList.remove('hidden');
  } else castSection.classList.add('hidden');

  const providersEl = $('#detailProviders');
  const listEl = $('#providersList');
  const providers = movie.watchProviders?.length ? movie.watchProviders : (movie.watchOn || []).map((p) => ({ provider: p, url: '#', icon: null }));

  if (providers.length) {
    listEl.innerHTML = providers.map((p) => `
      <a href="${p.url || '#'}" target="_blank" rel="noopener" class="provider-card">
        ${p.icon ? `<img src="${p.icon}" alt="" />` : '<span style="font-size:1.5rem">📺</span>'}
        <span>${escapeHtml(p.provider)}${p.affiliate ? '<span class="affiliate-tag">affiliate</span>' : ''}</span>
      </a>`).join('');
    providersEl.classList.remove('hidden');
  } else providersEl.classList.add('hidden');

  const inList = watchlist.some((w) => w.id === movie.id);
  const isWatched = watched.some((w) => w.id === movie.id);
  $('#detailWatchlistBtn').textContent = inList ? '✓ Saved' : '+ Watchlist';
  $('#detailWatchlistBtn').onclick = () => {
    toggleWatchlist(movie);
    $('#detailWatchlistBtn').textContent = watchlist.some((w) => w.id === movie.id) ? '✓ Saved' : '+ Watchlist';
  };
  $('#detailWatchedBtn').textContent = isWatched ? '✔ Watched' : 'Mark Watched';
  $('#detailWatchedBtn').onclick = () => toggleWatched(movie);

  renderReviewsList(movie.id);
  reviewStars = 0;
  $$('#reviewStars button').forEach((b) => b.classList.remove('active'));
  $('#reviewText').value = '';
}

function toggleDetailTrailer() {
  if (!currentMovie?.trailerKey) return;
  const el = $('#detailTrailer');
  const hidden = el.classList.contains('hidden');
  if (hidden) {
    $('#trailerFrame').src = `https://www.youtube.com/embed/${currentMovie.trailerKey}?autoplay=1&rel=0`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
    $('#trailerFrame').src = '';
  }
}

function closeDetail() {
  $('#detailView').classList.add('hidden');
  $('#mainView').classList.remove('hidden');
  $('#trailerFrame').src = '';
  currentMovie = null;
}

async function handleSearch() {
  const q = $('#searchInput').value.trim();
  if (!q) return;

  trackAnalytics(null, 'searches');

  const params = new URLSearchParams({ q });
  const genre = $('#filterGenre').value;
  const year = $('#filterYear').value;
  const minRating = $('#filterRating').value;
  if (genre) params.set('genre', genre);
  if (year) params.set('year', year);
  if (minRating) params.set('minRating', minRating);

  try {
    const res = await fetch(`${API}/search?${params}`);
    const data = await res.json();
    const dropdown = $('#searchResults');

    if (!data.movies?.length) {
      dropdown.innerHTML = '<div class="search-item" style="color:var(--muted)">No results found</div>';
    } else {
      dropdown.innerHTML = data.movies.slice(0, 8).map((m) => `
        <div class="search-item" data-id="${m.id}">
          ${m.poster ? `<img src="${posterSrc(m) || m.poster}" alt="" />` : ''}
          <div>
            <div style="font-weight:600;font-size:0.88rem">${escapeHtml(m.title)}</div>
            <div style="font-size:0.72rem;color:var(--muted)">${m.releaseDate?.split('-')[0] || ''} ${cardScoresHtml(m)}</div>
          </div>
        </div>`).join('');

      dropdown.querySelectorAll('.search-item[data-id]').forEach((item) => {
        item.addEventListener('click', () => {
          trackAnalytics(parseInt(item.dataset.id, 10), 'searches');
          openDetail(parseInt(item.dataset.id, 10));
          dropdown.classList.add('hidden');
          $('#searchInput').value = '';
        });
      });
    }
    dropdown.classList.remove('hidden');
  } catch {
    $('#searchResults').innerHTML = '<div class="search-item">Search failed</div>';
    $('#searchResults').classList.remove('hidden');
  }
}

function toggleWatchlist(movie) {
  const idx = watchlist.findIndex((w) => w.id === movie.id);
  if (idx >= 0) watchlist.splice(idx, 1);
  else {
    watchlist.push({ id: movie.id, title: movie.title, poster: movie.poster, rating: movie.rating, releaseDate: movie.releaseDate, imdbRating: movie.imdbRating });
    trackAnalytics(movie.id, 'watchlist');
  }
  localStorage.setItem(KEYS.watchlist, JSON.stringify(watchlist));
  updateWatchlistUI();
  if (Auth.isLoggedIn()) Auth.syncLocalData(watchlist, watched, reviews);
}

function toggleWatched(movie) {
  const idx = watched.findIndex((w) => w.id === movie.id);
  if (idx >= 0) watched.splice(idx, 1);
  else watched.push({ id: movie.id, title: movie.title, poster: movie.poster, date: new Date().toISOString() });
  localStorage.setItem(KEYS.watched, JSON.stringify(watched));
  $('#detailWatchedBtn').textContent = watched.some((w) => w.id === movie.id) ? '✔ Watched' : 'Mark Watched';
  renderProfile($('.profile-tabs .tab.active')?.dataset.tab || 'watchlist');
}

function submitReview() {
  if (!currentMovie) return;
  const text = $('#reviewText').value.trim();
  if (!reviewStars && !text) return;

  if (!reviews[currentMovie.id]) reviews[currentMovie.id] = [];
  reviews[currentMovie.id].unshift({
    stars: reviewStars,
    text,
    date: new Date().toISOString(),
    user: 'You',
  });
  localStorage.setItem(KEYS.reviews, JSON.stringify(reviews));
  renderReviewsList(currentMovie.id);
  $('#reviewText').value = '';
  reviewStars = 0;
  $$('#reviewStars button').forEach((b) => b.classList.remove('active'));
}

function renderReviewsList(movieId) {
  const list = reviews[movieId] || [];
  const el = $('#reviewsList');
  if (!list.length) {
    el.innerHTML = '<p class="panel-empty">No reviews yet. Be the first!</p>';
    return;
  }
  el.innerHTML = list.map((r) => `
    <div class="review-item">
      <div class="review-meta">${r.user} · ${new Date(r.date).toLocaleDateString()}</div>
      <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
      <p>${escapeHtml(r.text)}</p>
    </div>`).join('');
}

function updateWatchlistUI() {
  $('#watchlistCount').textContent = watchlist.length;
  const container = $('#watchlistItems');
  container.innerHTML = watchlist.length
    ? watchlist.map((m, i) => panelItemHtml(m, i, 'watchlist')).join('')
    : '<div class="panel-empty">Save movies with + on any card</div>';
  bindPanelItems(container, 'watchlist');
}

function renderProfile(tab) {
  const container = $('#profileContent');

  if (tab === 'account') {
    container.innerHTML = Auth.isLoggedIn()
      ? `<div class="panel-empty"><strong>${escapeHtml(Auth.user.name)}</strong><br>${escapeHtml(Auth.user.email)}<br><br><button class="btn btn-info" id="logoutBtn">Logout</button></div>`
      : `<div class="panel-empty">Not logged in<br><br><button class="btn btn-play" id="openAuthBtn">Login / Register</button></div>`;
    $('#logoutBtn')?.addEventListener('click', () => { Auth.logout(); updateAuthUI(); renderProfile('account'); });
    $('#openAuthBtn')?.addEventListener('click', () => openModal('authModal'));
    return;
  }

  if (tab === 'creator') {
    container.innerHTML = `
      <form class="creator-form" id="creatorForm">
        <input name="creatorName" placeholder="Your name" required />
        <input name="creatorEmail" type="email" placeholder="Email" />
        <input name="title" placeholder="Film title" required />
        <input name="genre" placeholder="Genre e.g. Drama" />
        <textarea name="description" placeholder="Synopsis" rows="3"></textarea>
        <input name="trailerUrl" placeholder="Trailer YouTube URL" />
        <input name="watchUrl" placeholder="Where to watch URL" />
        <input name="poster" type="file" accept="image/*" />
        <button type="submit" class="btn btn-play">Submit Film</button>
      </form>
      <p class="modal-sub" style="margin-top:0.5rem">Kenyan & African creators welcome 🇰🇪</p>`;
    $('#creatorForm').addEventListener('submit', submitCreatorForm);
    return;
  }

  if (tab === 'myreviews') {
    const all = [];
    Object.entries(reviews).forEach(([id, revs]) => {
      revs.forEach((r) => all.push({ id: parseInt(id, 10), ...r }));
    });
    container.innerHTML = all.length
      ? all.map((r) => `
        <div class="review-item">
          <div class="review-meta">Movie #${r.id} · ${new Date(r.date).toLocaleDateString()}</div>
          <div class="review-stars">${'★'.repeat(r.stars)}</div>
          <p>${escapeHtml(r.text)}</p>
        </div>`).join('')
      : '<div class="panel-empty">No reviews yet</div>';
    return;
  }

  const items = tab === 'watched' ? watched : watchlist;
  container.innerHTML = items.length
    ? items.map((m, i) => panelItemHtml(m, i, tab)).join('')
    : `<div class="panel-empty">${tab === 'watched' ? 'No watched movies yet' : 'Nothing saved yet'}</div>`;
  bindPanelItems(container, tab);
}

function panelItemHtml(m, i, type) {
  return `
    <div class="panel-item" data-id="${m.id}">
      ${m.poster ? `<img src="${posterSrc(m) || m.poster}" alt="" />` : ''}
      <div class="panel-item-info">
        <h4>${escapeHtml(m.title)}</h4>
        <span>${m.releaseDate?.split('-')[0] || ''} ${m.imdbRating ? `· IMDb ${m.imdbRating}` : ''}</span>
      </div>
    </div>`;
}

function bindPanelItems(container, type) {
  container.querySelectorAll('.panel-item').forEach((item) => {
    item.addEventListener('click', () => {
      openDetail(parseInt(item.dataset.id, 10));
      $$('.side-panel').forEach((p) => p.classList.add('hidden'));
    });
  });
}

function togglePanel(id) {
  const panel = $(`#${id}`);
  const isHidden = panel.classList.contains('hidden');
  $$('.side-panel').forEach((p) => p.classList.add('hidden'));
  if (isHidden) panel.classList.remove('hidden');
}

function scrollToRow(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function trackAnalytics(tmdbId, event) {
  if (!tmdbId && event !== 'searches') return;
  try {
    await fetch(`${ANALYTICS}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: tmdbId || 0, event }),
    });
  } catch { /* ignore */ }
}

function hideLoader() { $('#loader').classList.add('hidden'); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ── Phase 2-4 Features ── */

async function loadKenyaTop10() {
  try {
    const res = await fetch(`${ANALYTICS}/kenya/top10`);
    const data = await res.json();
    if (data.weekly) {
      $('#weeklyStats').textContent = `${data.weekly.totalEvents} interactions · ${data.weekly.uniqueMovies} movies this week`;
    }
    const list = $('#top10List');
    if (!data.movies?.length) {
      list.innerHTML = '<p class="modal-sub">Browse movies to build Kenya Top 10!</p>';
      return;
    }
    list.innerHTML = data.movies.map((m, i) => `
      <div class="top10-item" data-id="${m.id}">
        <span class="top10-rank">${i + 1}</span>
        ${m.poster ? `<img src="${posterSrc(m) || m.poster}" alt="" loading="lazy" />` : ''}
        <div class="top10-info">
          <h4>${escapeHtml(m.title)}</h4>
          <span>★ ${m.rating?.toFixed(1) || '—'} · ${m.score} pts · ${m.clicks} clicks</span>
        </div>
      </div>`).join('');
    list.querySelectorAll('.top10-item').forEach((el) => {
      el.addEventListener('click', () => openDetail(parseInt(el.dataset.id, 10)));
    });
  } catch { /* ignore */ }
}

function applyRowFilter(filter) {
  $$('.filter-chip').forEach((c) => c.classList.remove('active'));
  $(`#filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)?.classList.add('active');

  $$('.movie-row').forEach((row) => {
    const id = row.id;
    if (filter === 'all') row.classList.remove('filtered-out');
    else if (filter === 'free') row.classList.toggle('filtered-out', id !== 'free');
    else if (filter === 'african') row.classList.toggle('filtered-out', id !== 'african');
    else if (filter === 'kenya') row.classList.toggle('filtered-out', id !== 'kenya_trending');
  });

  if (filter !== 'all') {
    const target = filter === 'kenya' ? 'kenya_trending' : filter;
    scrollToRow(target);
  }
}

async function loadCreatorContent() {
  try {
    const res = await fetch(`${API_BASE}/api/creators/featured`);
    const { submissions } = await res.json();
    if (!submissions?.length) return;
    $('#creatorRow').classList.remove('hidden');
    $('#creatorCards').innerHTML = submissions.map((s) => `
      <article class="movie-card" data-url="${s.watchUrl || '#'}">
        <div class="card-inner">
          <div class="card-poster-wrap">
            ${s.posterUrl ? `<img class="card-poster" src="${s.posterUrl}" alt="${escapeHtml(s.title)}" />` : '<div class="card-placeholder">🎬</div>'}
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHtml(s.title)}</div>
            <div class="card-tags"><span class="card-tag">${escapeHtml(s.country || 'Kenya')}</span></div>
          </div>
        </div>
      </article>`).join('');
  } catch { /* ignore */ }
}

async function submitCreatorForm(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  try {
    const res = await fetch(`${API_BASE}/api/creators/submit`, { method: 'POST', body: fd });
    const data = await res.json();
    alert(data.success ? 'Film submitted for review!' : data.message);
    if (data.success) form.reset();
  } catch { alert('Upload failed — MongoDB required'); }
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); }

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  $('#authTitle').textContent = authMode === 'login' ? 'Login to Cine254' : 'Create Account';
  $('#authName').classList.toggle('hidden', authMode === 'login');
  $('#authSubmit').textContent = authMode === 'login' ? 'Login' : 'Register';
  $('#authToggle').textContent = authMode === 'login' ? 'Create account' : 'Already have account? Login';
}

async function handleAuth() {
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const name = $('#authName').value.trim();
  $('#authError').classList.add('hidden');
  try {
    if (authMode === 'register') await Auth.register(name, email, password);
    else await Auth.login(email, password);
    await Auth.syncLocalData(watchlist, watched, reviews);
    updateAuthUI();
    closeModal('authModal');
    alert('Welcome to Cine254!');
  } catch (err) {
    $('#authError').textContent = err.message;
    $('#authError').classList.remove('hidden');
  }
}

function updateAuthUI() {
  $('#loginBtn').textContent = Auth.isLoggedIn() ? Auth.user.name.split(' ')[0] : 'Login';
}

function openMpesaModal() {
  if (!currentMovie) return;
  $('#mpesaMovieTitle').textContent = currentMovie.title;
  fetch(`${API_BASE}/api/payments/price`).then((r) => r.json()).then((d) => {
    const label = d.sandbox
      ? `KES ${d.amount} (sandbox test — displays as KES ${d.displayAmount})`
      : `KES ${d.amount}`;
    $('#mpesaPrice').textContent = label;
    $('#mpesaPhone').placeholder = `Sandbox: ${d.testPhone || '254708374149'}`;
    $('#mpesaPhone').value = d.testPhone || '';
  });
  $('#mpesaStatus').textContent = 'Sandbox: enter 254708374149, PIN 174379 on prompt';
  openModal('mpesaModal');
}

async function handleMpesaPay() {
  const phone = $('#mpesaPhone').value.trim();
  if (!currentMovie) return;
  $('#mpesaStatus').textContent = 'Sending STK push...';
  $('#mpesaSubmit').disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/payments/stk-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone || undefined,
        tmdbId: currentMovie.id,
        movieTitle: currentMovie.title,
      }),
    });
    const data = await res.json();

    if (!data.success) {
      $('#mpesaStatus').textContent = data.message || 'Payment failed';
      $('#mpesaSubmit').disabled = false;
      return;
    }

    if (data.demo) {
      $('#mpesaStatus').textContent = data.message;
      $('#mpesaSubmit').disabled = false;
      return;
    }

    $('#mpesaStatus').textContent = `${data.message} — enter PIN 174379 on your phone...`;

    if (data.checkoutRequestId) {
      pollMpesaStatus(data.checkoutRequestId);
    }
  } catch {
    $('#mpesaStatus').textContent = 'Payment failed. Try again.';
    $('#mpesaSubmit').disabled = false;
  }
}

async function pollMpesaStatus(checkoutRequestId, attempts = 0) {
  if (attempts > 20) {
    $('#mpesaStatus').textContent = 'Timed out — check M-Pesa on your phone';
    $('#mpesaSubmit').disabled = false;
    return;
  }

  await new Promise((r) => setTimeout(r, 3000));

  try {
    const res = await fetch(`${API_BASE}/api/payments/query/${checkoutRequestId}`, { method: 'POST' });
    const data = await res.json();

    if (data.completed) {
      $('#mpesaStatus').textContent = '✅ Payment successful! Enjoy your movie.';
      $('#mpesaSubmit').disabled = false;
      return;
    }

    if (data.pending || data.resultCode === '103') {
      $('#mpesaStatus').textContent = 'Waiting for PIN confirmation...';
      return pollMpesaStatus(checkoutRequestId, attempts + 1);
    }

    $('#mpesaStatus').textContent = data.resultDesc || 'Payment not completed';
    $('#mpesaSubmit').disabled = false;
  } catch {
    pollMpesaStatus(checkoutRequestId, attempts + 1);
  }
}
