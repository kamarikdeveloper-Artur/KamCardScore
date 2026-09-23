# CS-0014 CardScore PWA Foundation and Offline Installability Completion Report

## Implementation Summary

Added a standards-based Progressive Web App foundation to CardScore while preserving the existing Poker and Mariage gameplay and local-first data model. CardScore now provides a Web App Manifest, local launcher icons, safe service-worker registration, a versioned offline application shell, standalone display metadata, and safe-area-compatible viewport configuration.

## Files Created

- `manifest.webmanifest`
- `service-worker.js`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`
- `Task/Reports/CS-0014-CardScore-PWA-Foundation-and-Offline-Installability-Report.md`

## Files Modified

- `index.html`
- `js/app.js`

The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Manifest Configuration

The manifest uses the CardScore identity with `name` and `short_name` set to `CardScore`. It uses relative `start_url` and `scope` values of `./`, requests `display: "standalone"`, and uses existing interface colors: `#f4f6f8` for the background and `#176b87` for the theme.

The manifest declares local 192 by 192 and 512 by 512 PNG icons with `purpose: "any maskable"`. It does not request a related native application and contains no production-domain dependency.

## Icons

Both icons are opaque, locally generated CardScore artwork using the existing accent, table yellow, danger red, and line colors. A centered score-card design, `CS` lettering, and card-suit diamond make the identity recognizable. Important content remains within padded launcher-safe bounds.

Image validation confirmed:

- `assets/icons/icon-192.png`: valid PNG, exactly 192 by 192 pixels.
- `assets/icons/icon-512.png`: valid PNG, exactly 512 by 512 pixels.

No external or copyrighted artwork was downloaded.

## HTML Metadata

The single viewport declaration is now `width=device-width, initial-scale=1.0, viewport-fit=cover`. The head also contains the relative manifest link, matching `#176b87` theme color, and a local Apple touch icon reference to the 192-pixel CardScore icon.

No obsolete PWA metadata, custom Install button, or `beforeinstallprompt` flow was added.

## Service Worker Registration

`js/app.js` registers `./service-worker.js` after page load only when service workers are available and the page is served through HTTPS, `localhost`, or `127.0.0.1`. Registration errors are caught and logged without affecting application startup or gameplay. No registration is attempted for `file://` usage.

## Cached Application Shell

The explicit allowlist contains only the current runtime resources:

- Root navigation and `index.html`.
- `manifest.webmanifest`.
- `css/style.css`.
- `js/storage.js`, `js/app.js`, `js/games/poker.js`, and `js/games/mariage.js`.
- `assets/backgrounds/bg_games.png`.
- Four local suit SVG files.
- The 192 and 512 CardScore icons.

No `Task/`, report, completed-task, source-generation, or development files are cached. The future Mariage SVG paths are not included because those files do not currently exist; the established semantic fallback symbols remain available offline.

## Caching Strategy

The service worker precaches the complete allowlisted shell during installation. Known same-origin shell assets use cache-first delivery. Navigation to the app root or `index.html` uses network-first delivery with cached `index.html` as the offline fallback. Other navigation paths are not intercepted. Cross-origin requests, non-GET requests, and same-origin files outside the allowlist are not cached or intercepted as application assets. Failed shell fetches return a controlled error response rather than throwing inside the worker.

The service worker does not read, copy, replace, or synchronize game data. Existing `localStorage` keys remain the authoritative persistence mechanism for both games and History.

## Cache Version and Updates

The initial explicit cache is `cardscore-v1`, under the `cardscore-` prefix. Installation must finish caching the full shell before `skipWaiting()` runs. Activation deletes only obsolete caches whose names begin with the CardScore prefix, then uses `clients.claim()` so the fully installed version can control open pages promptly. Unrelated origin caches are preserved.

Future application-shell releases should increment the cache version. A controlled localhost test pre-created `cardscore-v0` and `unrelated-test-cache`; activation removed only `cardscore-v0`, retained the unrelated cache, and created the complete `cardscore-v1` shell.

## Localhost and Offline Tests

The project was served by a temporary dependency-free Node HTTP server at `http://127.0.0.1:4173` with correct HTML, JavaScript, CSS, manifest, PNG, and SVG MIME types. A fresh headless Chrome profile was used for service-worker, Cache Storage, manifest, online, and emulated-offline checks. Temporary server, profile, and test files were removed afterward.

Chrome confirmed an activated controlling service worker with scope `http://127.0.0.1:4173/`. The resulting cache contained exactly the 15 allowlisted resources, and no path under `Task/`.

After online setup, network access was disabled through the browser protocol and the page was reloaded while bypassing the normal HTTP cache. CardScore loaded from the service worker. The manifest, CSS, application JavaScript, background, all four suit assets, and both icons remained fetchable. A `Task/Completed` request failed offline, confirming that development documentation was not cached.

A targeted navigation-handler check after the final route restriction confirmed that only the app root and `index.html` are intercepted; `Task/` and cross-origin navigations are left untouched.

Poker and Mariage current games created online remained present in their existing independent `localStorage` keys. Both Continue flows opened successfully offline. The Poker fixed Order status remained visible, fixed to the viewport, and within the viewport bottom after enabling `viewport-fit=cover`; its existing safe-area CSS remained active.

## Manifest and Installability Tests

Chrome's manifest parser detected `CardScore`, relative start URL and scope, standalone display mode, and both required icon sizes. `Page.getAppManifest` reported no manifest errors, and `Page.getInstallabilityErrors` returned no installability errors in the localhost test environment.

Actual operating-system installation and physical Android/iOS launcher rendering were not exercised in headless Chrome. Native Add to Home Screen availability remains browser/platform controlled. Service workers and installation require HTTPS or the trusted local origins `http://localhost` or `http://127.0.0.1`; they are intentionally unavailable when CardScore is opened directly through `file://`.

## Gameplay Regression Results

Poker smoke regressions passed for Pass scoring, exact and failed Orders, Mines, Golden rounds, last-player restrictions, finite ACTUAL pools, persistence, offline Continue, and the fixed Order status.

Mariage smoke regressions passed for the 3-player 500 maximum, 4-player 420 maximum, arbitrary actual points, arbitrary result order, Bite plus Ski, Ski, Repaint, round completion, persistence, and offline Continue.

All JavaScript files, including `service-worker.js`, passed `node --check`. Manifest JSON parsing, manifest icon-path resolution, PNG format and dimensions, unique viewport metadata, and absence of custom installation UI were also verified.

No deployment configuration, production domain, Git/GitHub integration, Builds directory, cloud synchronization, push notifications, background sync, automatic ZIP generation, or archive was added.
