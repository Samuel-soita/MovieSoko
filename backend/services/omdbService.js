const axios = require('axios');

class OmdbService {
  constructor() {
    this.apiKey = process.env.OMDB_API_KEY;
    this.baseUrl = 'http://www.omdbapi.com/';
  }

  get enabled() {
    return this.apiKey && this.apiKey !== 'your_omdb_api_key_here';
  }

  parseRatings(ratings = []) {
    const result = { rtCritic: null, rtAudience: null, metacritic: null };
    for (const r of ratings) {
      if (r.Source === 'Rotten Tomatoes') result.rtCritic = r.Value;
      if (r.Source === 'Metacritic') result.metacritic = r.Value;
    }
    return result;
  }

  estimateAudienceScore(tmdbRating) {
    if (!tmdbRating) return null;
    return `${Math.round(tmdbRating * 10)}%`;
  }

  async fetchByTitle(title, year, tmdbRating) {
    if (!this.enabled) {
      return {
        rtAudience: this.estimateAudienceScore(tmdbRating),
      };
    }

    try {
      const { data } = await axios.get(this.baseUrl, {
        params: { apikey: this.apiKey, t: title, y: year, plot: 'short' },
        timeout: 10000,
      });

      if (data.Response === 'False') {
        return { rtAudience: this.estimateAudienceScore(tmdbRating) };
      }

      const parsed = this.parseRatings(data.Ratings || []);
      return {
        imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
        imdbId: data.imdbID !== 'N/A' ? data.imdbID : null,
        awards: data.Awards !== 'N/A' ? data.Awards : null,
        runtime: data.Runtime !== 'N/A' ? parseInt(data.Runtime, 10) : null,
        rtCritic: parsed.rtCritic,
        rtAudience: parsed.rtAudience || this.estimateAudienceScore(tmdbRating),
        metacritic: parsed.metacritic,
      };
    } catch {
      return { rtAudience: this.estimateAudienceScore(tmdbRating) };
    }
  }
}

module.exports = new OmdbService();
