const Auth = {
  get apiBase() {
    return window.CINE254_API || '';
  },
  token: localStorage.getItem('cine254_token'),
  user: JSON.parse(localStorage.getItem('cine254_user') || 'null'),

  isLoggedIn() {
    return !!this.token;
  },

  headers() {
    return this.token ? { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  },

  async register(name, email, password) {
    const res = await fetch(`${this.apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    this.setSession(data.token, data.user);
    return data.user;
  },

  async login(email, password) {
    const res = await fetch(`${this.apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    this.setSession(data.token, data.user);
    return data.user;
  },

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('cine254_token', token);
    localStorage.setItem('cine254_user', JSON.stringify(user));
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('cine254_token');
    localStorage.removeItem('cine254_user');
  },

  async syncLocalData(watchlist, watched, reviews) {
    if (!this.isLoggedIn()) return;
    await fetch(`${this.apiBase}/api/users/sync`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        watchlist: watchlist.map((w) => ({ tmdbId: w.id, title: w.title, poster: w.poster })),
        watched: watched.map((w) => ({ tmdbId: w.id, title: w.title })),
        reviews,
      }),
    });
  },

  async subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch(`${this.apiBase}/api/notifications/vapid-key`);
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${this.apiBase}/api/notifications/subscribe`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ subscription: sub }),
    });
    return true;
  },
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

window.Auth = Auth;
