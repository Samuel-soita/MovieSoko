const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const WATCH_REGION = process.env.WATCH_REGION || 'KE';

class TmdbService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY;
  }

  get configured() {
    return this.apiKey && this.apiKey !== 'your_tmdb_api_key_here';
  }

  get client() {
    return axios.create({
      baseURL: TMDB_BASE,
      params: { api_key: this.apiKey },
      timeout: 15000,
    });
  }

  posterUrl(path, size = 'w500') {
    return path ? `${TMDB_IMG}/${size}${path}` : null;
  }

  backdropUrl(path, size = 'original') {
    return path ? `${TMDB_IMG}/${size}${path}` : null;
  }

  profileUrl(path) {
    return path ? `${TMDB_IMG}/w185${path}` : null;
  }

  normalizeMovie(movie, categories = [], extras = {}) {
    return {
      tmdbId: movie.id,
      title: movie.title || movie.name,
      originalTitle: movie.original_title || movie.original_name,
      overview: movie.overview || '',
      poster: this.posterUrl(movie.poster_path),
      backdrop: this.backdropUrl(movie.backdrop_path),
      releaseDate: movie.release_date || movie.first_air_date || '',
      rating: movie.vote_average || 0,
      voteCount: movie.vote_count || 0,
      genres: (movie.genres || []).map((g) => ({ id: g.id, name: g.name })),
      runtime: movie.runtime,
      status: movie.status,
      tagline: movie.tagline,
      categories,
      popularity: movie.popularity || 0,
      source: 'TMDB',
      lastSynced: new Date(),
      isFree: extras.isFree || false,
      watchOn: extras.watchOn || [],
      trailerKey: extras.trailerKey || null,
    };
  }

  parseProviders(providersData) {
    const region = providersData?.results?.[WATCH_REGION] || providersData?.results?.US;
    if (!region) return { isFree: false, watchOn: [] };

    const watchOn = [];
    let isFree = false;

    for (const type of ['free', 'ads']) {
      for (const p of region[type] || []) {
        isFree = true;
        if (!watchOn.includes(p.provider_name)) watchOn.push(p.provider_name);
      }
    }
    for (const type of ['flatrate', 'rent', 'buy']) {
      for (const p of region[type] || []) {
        if (!watchOn.includes(p.provider_name)) watchOn.push(p.provider_name);
      }
    }

    return { isFree, watchOn: watchOn.slice(0, 5) };
  }

  async fetchTrending() {
    const { data } = await this.client.get('/trending/movie/week');
    return (data.results || []).map((m) => this.normalizeMovie(m, ['trending']));
  }

  async fetchPopular() {
    const { data } = await this.client.get('/movie/popular');
    return (data.results || []).map((m) => this.normalizeMovie(m, ['popular']));
  }

  async fetchNowPlaying() {
    const { data } = await this.client.get('/movie/now_playing', {
      params: { region: WATCH_REGION },
    });
    return (data.results || []).map((m) => this.normalizeMovie(m, ['new_releases']));
  }

  async fetchUpcoming() {
    const { data } = await this.client.get('/movie/upcoming', {
      params: { region: WATCH_REGION },
    });
    return (data.results || []).map((m) => this.normalizeMovie(m, ['upcoming']));
  }

  async fetchTopRated() {
    const { data } = await this.client.get('/movie/top_rated');
    return (data.results || []).map((m) => this.normalizeMovie(m, ['top_rated']));
  }

  async fetchFreeToWatch() {
    const { data } = await this.client.get('/discover/movie', {
      params: {
        watch_region: WATCH_REGION,
        with_watch_monetization_types: 'free|ads',
        sort_by: 'popularity.desc',
      },
    });
    return (data.results || []).map((m) =>
      this.normalizeMovie(m, ['free'], { isFree: true, watchOn: ['Free', 'YouTube'] })
    );
  }

  async fetchAfricanMovies() {
    const { data } = await this.client.get('/discover/movie', {
      params: {
        with_origin_country: 'KE|NG|ZA|GH|UG|TZ|ET|RW|SN|CM',
        sort_by: 'popularity.desc',
      },
    });
    return (data.results || []).map((m) => this.normalizeMovie(m, ['african']));
  }

  async fetchKenyaMovies() {
    const { data } = await this.client.get('/discover/movie', {
      params: {
        with_origin_country: 'KE',
        sort_by: 'popularity.desc',
      },
    });
    return (data.results || []).map((m) => this.normalizeMovie(m, ['kenya']));
  }

  async fetchByGenre(genreId, genreName) {
    const { data } = await this.client.get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc' },
    });
    return (data.results || []).map((m) =>
      this.normalizeMovie(m, [`genre_${genreName.toLowerCase()}`])
    );
  }

  async fetchMovieDetails(id) {
    const { data } = await this.client.get(`/movie/${id}`, {
      params: { append_to_response: 'videos,credits,watch/providers' },
    });
    const trailer = (data.videos?.results || []).find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );
    const { isFree, watchOn } = this.parseProviders(data['watch/providers']);
    const normalized = this.normalizeMovie(data, [], { isFree, watchOn, trailerKey: trailer?.key || null });
    normalized.cast = (data.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile: this.profileUrl(c.profile_path),
    }));
    return normalized;
  }

  async fetchMoviesByIds(ids) {
    const movies = [];
    for (const id of ids) {
      try {
        const details = await this.fetchMovieDetails(id);
        movies.push({ ...details, categories: ['kenya_trending'] });
      } catch {
        /* skip */
      }
    }
    return movies;
  }

  async searchMovies(query, filters = {}) {
    const params = { query, include_adult: false };
    if (filters.year) params.year = filters.year;
    const { data } = await this.client.get('/search/movie', { params });
    let results = (data.results || []).map((m) => this.normalizeMovie(m, ['search']));

    if (filters.genre) {
      const genreId = parseInt(filters.genre, 10);
      results = results.filter((m) => m.genres?.some((g) => g.id === genreId));
    }
    if (filters.minRating) {
      const min = parseFloat(filters.minRating);
      results = results.filter((m) => m.rating >= min);
    }

    return results;
  }

  async fetchGenreList() {
    const { data } = await this.client.get('/genre/movie/list');
    return data.genres || [];
  }
}

module.exports = new TmdbService();
