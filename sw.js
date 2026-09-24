// Bump this when any of the cached files change, or browsers will keep serving
// the old copies from disk forever.
var VERSION = "feriendichte-v17";

var SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icon-180.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === VERSION ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  // Holiday data is someone else's server and is already cached in
  // localStorage for 30 days. Let it go straight to the network and fail
  // honestly when there is none — caching it here would only duplicate that.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Cache first: the whole point is that a tunnel or a plane still works.
  // A fresh copy is fetched in the background for the next visit.
  e.respondWith(
    caches.match(req).then(function (hit) {
      var live = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });

      return hit || live;
    })
  );
});
