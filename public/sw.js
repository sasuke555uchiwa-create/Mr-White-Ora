const CACHE_NAME = 'blacksite-shell-v12';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/images/game_logo.webp',
  '/images/1.png',
  '/images/2.png',
  '/images/3.png',
  '/images/4.png',
  '/assets/ui/home.png',
  '/assets/blacksite/icons/navigation-artwork/vault.webp',
  '/assets/blacksite/icons/navigation-artwork/rankings.webp',
  '/assets/blacksite/icons/navigation-artwork/dictionary.webp',
  '/assets/blacksite/icons/navigation-artwork/agents.webp',
  '/assets/blacksite/icons/navigation-artwork/settings.webp',
  '/assets/wallpapers/dark_cosmic.webp',
  '/assets/wallpapers/light_sakura.webp',
  '/assets/roles/civilian_agent.png',
  '/assets/roles/undercover_agent.png',
  '/assets/roles/mr_white_agent.png',
  '/assets/roles/boomerang.png',
  '/assets/roles/fool.png',
  '/assets/roles/ghost.png',
  '/assets/roles/judge.png',
  '/assets/roles/lovers.png',
  '/assets/roles/mr_meme.png',
  '/assets/roles/protector.png',
  '/assets/roles/wizard.png',
];

const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebase.googleapis.com',
  'firebaseapp.com',
  'cloudfunctions.net',
  'accounts.google.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'apis.google.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(SHELL_ASSETS.map((assetUrl) => cache.add(assetUrl)))
      )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldBypassRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (request.cache === 'no-store') return true;
  if (request.headers.has('authorization')) return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith('/__/')) return true;
  if (url.pathname.startsWith('/api/')) return true;
  return BYPASS_HOSTS.some((host) => url.hostname.endsWith(host));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Never intercept or cache Firebase, Auth, Cloud Functions, API calls, or cross-origin private data
  if (shouldBypassRequest(request, url)) {
    return;
  }

  // Navigation requests: Network-first with offline index.html fallback so local play launches offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Content-hashed build bundles (/assets/*.js, /assets/*.css): Cache-first with network fallback
  if (url.pathname.startsWith('/assets/') && /\.(js|css|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static same-origin assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
