const axios = require('axios');

class UtellyService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.host = process.env.UTELLY_HOST || 'utelly-tv-shows-and-movies-availability-v1.p.rapidapi.com';
  }

  get enabled() {
    return this.apiKey && this.apiKey !== 'your_rapidapi_key_here';
  }

  parseResponse(data) {
    const locations = [];
    const itemLists = [...(data?.items || []), ...(data?.results || [])];

    for (const item of itemLists) {
      for (const loc of item.locations || []) {
        locations.push({
          provider: loc.display_name || loc.name || loc.provider,
          url: loc.url || loc.deeplink || '#',
          icon: loc.icon || loc.logo,
          type: item.type || item.media_type,
        });
      }
    }
    return locations.slice(0, 12);
  }

  async lookupOnHost(host, title, country) {
    const { data } = await axios.get(`https://${host}/lookup`, {
      params: { term: title, country },
      headers: { 'X-RapidAPI-Key': this.apiKey, 'X-RapidAPI-Host': host },
      timeout: 10000,
    });
    return this.parseResponse(data);
  }

  async lookup(title, country = 'ke') {
    if (!this.enabled) return { providers: [], error: 'no_key' };

    try {
      const providers = await this.lookupOnHost(this.host, title, country);
      if (providers.length) return { providers, host: this.host };
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) return { providers: [], error: 429, message: 'Rate limited — try again shortly' };
      if (status === 403) return { providers: [], error: 403, message: 'Not subscribed to Utelly API' };
      if (status === 404) {
        try {
          const providers = await this.lookupOnHost(this.host, title, 'us');
          if (providers.length) return { providers, host: this.host };
        } catch (e) {
          return { providers: [], error: e.response?.status || 'failed' };
        }
      }
      return { providers: [], error: status || err.message };
    }

    return { providers: [], error: 'empty' };
  }

  async lookupList(title, country = 'ke') {
    return (await this.lookup(title, country)).providers;
  }
}

module.exports = new UtellyService();
