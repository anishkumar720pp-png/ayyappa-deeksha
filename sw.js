const CACHE_NAME = "ayyappa-deeksha-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./data/ui-strings.js",
  "./data/guru-qa.js",
  "./data/visual-cards.js",
  "./data/stories.js",
  "./data/irumudi.js",
  "./data/bhajans.js",
  "./data/yatra-route.js",
  "./modules/saranam-japa.js",
  "./modules/selfie-album.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
