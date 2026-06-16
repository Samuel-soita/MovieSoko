const Movie = require('../models/Movie');
const tmdbService = require('./tmdbService');
const omdbService = require('./omdbService');
const { getKenyaTrendingIds } = require('./analyticsService');

const GENRE_MAP = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
];

const ROW_CONFIG = [
  { key: 'kenya_trending', title: 'Trending in Kenya', category: 'kenya_trending', live: 'kenyaTrending' },
  { key: 'free', title: 'Free to Watch', category: 'free', live: 'free' },
  { key: 'trending', title: 'Trending Now', category: 'trending', live: 'trending' },
  { key: 'new', title: 'New Releases', category: 'new_releases', live: 'nowPlaying' },
  { key: 'african', title: 'African Movies', category: 'african', live: 'african' },
  { key: 'top_rated', title: 'Top Rated', category: 'top_rated', live: 'topRated' },
  { key: 'popular', title: 'Popular Worldwide', category: 'popular', live: 'popular' },
  { key: 'upcoming', title: 'Coming Soon', category: 'upcoming', live: 'upcoming' },
];

async function upsertMovie(movieData) {
  try {
    const existing = await Movie.findOne({ tmdbId: movieData.tmdbId });
    const mergedCategories = existing
      ? [...new Set([...(existing.categories || []), ...(movieData.categories || [])])]
      : movieData.categories || [];

    return Movie.findOneAndUpdate(
      { tmdbId: movieData.tmdbId },
      { ...movieData, categories: mergedCategories, lastSynced: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch {
    return null;
  }
}

async function syncAllMovies() {
  if (!tmdbService.configured) {
    console.warn('[Sync] TMDB_API_KEY not configured — skipping sync');
    return { synced: 0, error: 'TMDB_API_KEY missing' };
  }

  console.log('[Sync] Starting movie sync...');
  let count = 0;

  const batches = [
    { fn: () => tmdbService.fetchTrending(), label: 'trending' },
    { fn: () => tmdbService.fetchPopular(), label: 'popular' },
    { fn: () => tmdbService.fetchNowPlaying(), label: 'now_playing' },
    { fn: () => tmdbService.fetchUpcoming(), label: 'upcoming' },
    { fn: () => tmdbService.fetchTopRated(), label: 'top_rated' },
    { fn: () => tmdbService.fetchFreeToWatch(), label: 'free' },
    { fn: () => tmdbService.fetchAfricanMovies(), label: 'african' },
    { fn: () => tmdbService.fetchKenyaMovies(), label: 'kenya' },
  ];

  for (const batch of batches) {
    try {
      const movies = await batch.fn();
      for (const movie of movies) {
        await upsertMovie(movie);
        count++;
      }
      console.log(`[Sync] ${batch.label}: ${movies.length} movies`);
    } catch (err) {
      console.error(`[Sync] ${batch.label} failed:`, err.message);
    }
  }

  for (const genre of GENRE_MAP) {
    try {
      const movies = await tmdbService.fetchByGenre(genre.id, genre.name);
      for (const movie of movies.slice(0, 15)) {
        await upsertMovie(movie);
        count++;
      }
    } catch (err) {
      console.error(`[Sync] genre ${genre.name} failed:`, err.message);
    }
  }

  console.log(`[Sync] Complete — ${count} upserts`);
  return { synced: count };
}

async function enrichMovie(movie) {
  const obj = movie.toObject ? movie.toObject() : { ...movie };
  const year = obj.releaseDate ? obj.releaseDate.split('-')[0] : undefined;
  const omdb = await omdbService.fetchByTitle(obj.title, year, obj.rating);

  const enriched = { ...obj, ...omdb };

  if (movie._id) {
    try {
      await Movie.findByIdAndUpdate(movie._id, {
        imdbRating: omdb.imdbRating,
        imdbId: omdb.imdbId,
        awards: omdb.awards,
        rtCritic: omdb.rtCritic,
        rtAudience: omdb.rtAudience,
        metacritic: omdb.metacritic,
      });
    } catch {
      /* no db */
    }
  }

  return enriched;
}

async function fetchKenyaTrendingLive() {
  const analyticsIds = getKenyaTrendingIds(10);
  let movies = [];

  if (analyticsIds.length) {
    movies = await tmdbService.fetchMoviesByIds(analyticsIds);
  }

  if (movies.length < 10) {
    const [kenya, trending] = await Promise.all([
      tmdbService.fetchKenyaMovies(),
      tmdbService.fetchTrending(),
    ]);
    const seen = new Set(movies.map((m) => m.tmdbId));
    for (const m of [...kenya, ...trending]) {
      if (!seen.has(m.tmdbId)) {
        movies.push({ ...m, categories: ['kenya_trending'] });
        seen.add(m.tmdbId);
      }
      if (movies.length >= 20) break;
    }
  }

  return movies.slice(0, 20);
}

const LIVE_FETCHERS = {
  trending: () => tmdbService.fetchTrending(),
  popular: () => tmdbService.fetchPopular(),
  nowPlaying: () => tmdbService.fetchNowPlaying(),
  upcoming: () => tmdbService.fetchUpcoming(),
  topRated: () => tmdbService.fetchTopRated(),
  free: () => tmdbService.fetchFreeToWatch(),
  african: () => tmdbService.fetchAfricanMovies(),
  kenyaTrending: () => fetchKenyaTrendingLive(),
};

module.exports = {
  syncAllMovies,
  upsertMovie,
  enrichMovie,
  GENRE_MAP,
  ROW_CONFIG,
  LIVE_FETCHERS,
  fetchKenyaTrendingLive,
};
