/// <reference lib="webworker" />
// Minimal service worker: makes the app installable and serves the built
// JS/CSS/icons from cache. Pages and data always come from the server — the
// database lives there, so there is no offline mode to fake.
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const CACHE = `golf-gapping-${version}`;
// Manifest paths are relative to the app root; normalise to absolute pathnames.
const ASSETS = new Set(
	[...immutable, ...assets].map((f) => new URL(f.path, sw.location.origin + '/').pathname)
);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll([...ASSETS]))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin || !ASSETS.has(url.pathname)) return;
	event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(event.request)));
});
