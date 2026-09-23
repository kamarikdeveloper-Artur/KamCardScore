"use strict";

const CACHE_PREFIX = "cardscore-";
const CACHE_NAME = `${CACHE_PREFIX}v7`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/storage.js",
  "./js/games/poker.js",
  "./js/games/mariage-config.js",
  "./js/games/mariage.js",
  "./js/app.js",
  "./assets/backgrounds/bg_games.png",
  "./assets/suits/spades.svg",
  "./assets/suits/hearts.svg",
  "./assets/suits/clubs.svg",
  "./assets/suits/diamonds.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon_barrel.svg",
  "./assets/icons/edit-table.svg"
];
const INDEX_URL = new URL("./index.html", self.registration.scope).href;
const ROOT_URL = new URL("./", self.registration.scope).href;
const APP_SHELL_URLS = new Set(APP_SHELL.map(function (path) {
  return new URL(path, self.registration.scope).href;
}));

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames.map(function (cacheName) {
          const isObsoleteCardScoreCache = cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME;
          return isObsoleteCardScoreCache ? caches.delete(cacheName) : Promise.resolve(false);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (requestUrl.href !== ROOT_URL && requestUrl.href !== INDEX_URL) return;
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { return cache.put(INDEX_URL, copy); });
          }
          return response;
        })
        .catch(function () { return caches.match(INDEX_URL); })
    );
    return;
  }

  if (!APP_SHELL_URLS.has(requestUrl.href)) return;

  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      if (cachedResponse) return cachedResponse;
      return fetch(request)
        .then(function (response) {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
          }
          return response;
        })
        .catch(function () { return Response.error(); });
    })
  );
});
