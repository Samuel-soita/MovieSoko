const AFFILIATE_MAP = {
  Netflix: process.env.AFFILIATE_NETFLIX || '',
  'Prime Video': process.env.AFFILIATE_PRIME || '',
  Showmax: process.env.AFFILIATE_SHOWMAX || '',
  'Disney Plus': process.env.AFFILIATE_DISNEY || '',
};

function wrapAffiliateUrl(provider, url) {
  if (!url || url === '#') return url;
  const affiliateBase = AFFILIATE_MAP[provider];
  if (!affiliateBase) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('ref', affiliateBase);
    return u.toString();
  } catch {
    return `${url}${url.includes('?') ? '&' : '?'}ref=${affiliateBase}`;
  }
}

function enrichProviders(providers) {
  return providers.map((p) => ({
    ...p,
    url: wrapAffiliateUrl(p.provider, p.url),
    affiliate: !!AFFILIATE_MAP[p.provider],
  }));
}

module.exports = { wrapAffiliateUrl, enrichProviders };
