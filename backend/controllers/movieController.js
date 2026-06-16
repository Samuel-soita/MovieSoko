const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const tmdbService = require('../services/tmdbService');
const utellyService = require('../services/utellyService');
const { enrichProviders } = require('../services/affiliateService');
const { enrichMovie, GENRE_MAP, ROW_CONFIG, LIVE_FETCHERS } = require('../services/movieService');

function dbReady() {
  return mongoose.connection.readyState === 1;
}

function formatMovie(m) {
  return {
    id: m.tmdbId,
    _id: m._id,
    title: m.title,
    overview: m.overview,
    poster: m.poster,
    backdrop: m.backdrop,
    releaseDate: m.releaseDate,
    rating: m.rating,
    voteCount: m.voteCount,
    genres: m.genres || [],
    categories: m.categories || [],
    imdbRating: m.imdbRating,
    rtCritic: m.rtCritic,
    rtAudience: m.rtAudience,
    metacritic: m.metacritic,
    trailerKey: m.trailerKey,
    tagline: m.tagline,
    popularity: m.popularity,
    isFree: m.isFree || false,
    watchOn: m.watchOn || [],
    cast: m.cast || [],
  };
}

async function getByCategory(req, res) {
  try {
    const category = req.params.category;
    if (!dbReady()) {
      const row = ROW_CONFIG.find((r) => r.category === category);
      if (row?.live && LIVE_FETCHERS[row.live]) {
        const movies = await LIVE_FETCHERS[row.live]();
        return res.json({ success: true, count: movies.length, movies: movies.map(formatMovie), source: 'tmdb' });
      }
    }
    const movies = await Movie.find({ categories: category }).sort({ popularity: -1 }).limit(20).lean();
    res.json({ success: true, count: movies.length, movies: movies.map(formatMovie) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getTrending(req, res) {
  req.params = { category: 'trending' };
  return getByCategory(req, res);
}

async function getPopular(req, res) {
  req.params = { category: 'popular' };
  return getByCategory(req, res);
}

async function getNew(req, res) {
  req.params = { category: 'new_releases' };
  return getByCategory(req, res);
}

async function getUpcoming(req, res) {
  req.params = { category: 'upcoming' };
  return getByCategory(req, res);
}

async function getByGenre(req, res) {
  try {
    const genre = req.params.genre.toLowerCase();
    if (!dbReady()) {
      const g = GENRE_MAP.find((x) => x.name.toLowerCase() === genre);
      if (g) {
        const movies = await tmdbService.fetchByGenre(g.id, g.name);
        return res.json({ success: true, count: movies.length, movies: movies.slice(0, 20).map(formatMovie), source: 'tmdb' });
      }
    }
    const movies = await Movie.find({ categories: `genre_${genre}` }).sort({ popularity: -1 }).limit(20).lean();
    res.json({ success: true, count: movies.length, movies: movies.map(formatMovie) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getFeatured(req, res) {
  try {
    const live = await getAllRowsLive();
    res.json({ success: true, movie: live.featured, heroes: live.heroes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getMovieById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    let movie = null;

    if (dbReady()) {
      movie = await Movie.findOne({ tmdbId: id });
    }

    let details;
    if (!movie || !movie.trailerKey || !movie.cast?.length) {
      details = await tmdbService.fetchMovieDetails(id);
      if (dbReady()) {
        movie = await Movie.findOneAndUpdate(
          { tmdbId: id },
          { ...details, categories: movie?.categories || ['detail'] },
          { upsert: true, new: true }
        );
      } else {
        movie = details;
      }
    }

    const enriched = await enrichMovie(movie);
    let watchProviders = enrichProviders(await utellyService.lookupList(enriched.title, 'ke'));

    if (!watchProviders.length && enriched.watchOn?.length) {
      watchProviders = enrichProviders(
        enriched.watchOn.map((name) => ({ provider: name, url: '#', icon: null }))
      );
    }

    res.json({
      success: true,
      movie: {
        ...formatMovie(enriched),
        runtime: enriched.runtime,
        status: enriched.status,
        awards: enriched.awards,
        imdbId: enriched.imdbId,
        watchProviders,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function searchMovies(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query required' });
    }

    const filters = {
      year: req.query.year,
      genre: req.query.genre,
      minRating: req.query.minRating,
    };

    if (dbReady()) {
      const movies = await Movie.find({ $text: { $search: q } }).limit(30).lean();
      let filtered = movies;
      if (filters.year) filtered = filtered.filter((m) => m.releaseDate?.startsWith(filters.year));
      if (filters.minRating) filtered = filtered.filter((m) => m.rating >= parseFloat(filters.minRating));
      if (filtered.length > 0) {
        return res.json({ success: true, count: filtered.length, movies: filtered.slice(0, 20).map(formatMovie), source: 'database' });
      }
    }

    const tmdbResults = await tmdbService.searchMovies(q, filters);
    res.json({
      success: true,
      count: tmdbResults.length,
      movies: tmdbResults.slice(0, 20).map(formatMovie),
      source: 'tmdb',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getGenres(req, res) {
  res.json({ success: true, genres: GENRE_MAP });
}

async function getAllRowsLive() {
  const result = {};

  await Promise.all(
    ROW_CONFIG.map(async (row) => {
      try {
        const fetcher = LIVE_FETCHERS[row.live];
        const movies = fetcher ? await fetcher() : [];
        result[row.key] = { title: row.title, movies: movies.slice(0, 20).map(formatMovie) };
      } catch {
        result[row.key] = { title: row.title, movies: [] };
      }
    })
  );

  for (const genre of GENRE_MAP) {
    try {
      const movies = await tmdbService.fetchByGenre(genre.id, genre.name);
      result[genre.name.toLowerCase()] = {
        title: genre.name,
        movies: movies.slice(0, 20).map(formatMovie),
      };
    } catch {
      result[genre.name.toLowerCase()] = { title: genre.name, movies: [] };
    }
  }

  const heroes = (result.trending?.movies || []).slice(0, 5);
  const featured = result.kenya_trending?.movies?.[0] || heroes[0] || null;

  return { featured, heroes, rows: result, source: 'tmdb' };
}

async function getAllRows(req, res) {
  try {
    if (!dbReady()) {
      const live = await getAllRowsLive();
      return res.json({ success: true, ...live });
    }

    const result = {};

    await Promise.all(
      ROW_CONFIG.map(async (row) => {
        const movies = await Movie.find({ categories: row.category }).sort({ popularity: -1 }).limit(20).lean();
        result[row.key] = { title: row.title, movies: movies.map(formatMovie) };
      })
    );

    for (const genre of GENRE_MAP) {
      const movies = await Movie.find({ categories: `genre_${genre.name.toLowerCase()}` })
        .sort({ popularity: -1 })
        .limit(20)
        .lean();
      result[genre.name.toLowerCase()] = { title: genre.name, movies: movies.map(formatMovie) };
    }

    const hasData = Object.values(result).some((r) => r.movies.length > 0);
    if (!hasData) {
      const live = await getAllRowsLive();
      return res.json({ success: true, ...live });
    }

    const heroes = (result.trending?.movies || []).slice(0, 5);
    const featured = result.kenya_trending?.movies?.[0] || heroes[0] || null;

    res.json({ success: true, featured, heroes, rows: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getTrending,
  getPopular,
  getNew,
  getUpcoming,
  getByGenre,
  getFeatured,
  getMovieById,
  searchMovies,
  getGenres,
  getAllRows,
};
