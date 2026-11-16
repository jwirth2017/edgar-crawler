# Golf Gapping

A personal, local-first gapping tracker: log launch-monitor sessions on your
phone, see trimmed carry numbers per club, and spot gaps and overlaps in the bag.

SvelteKit + SQLite. No accounts, no cloud. One process, one database file.

## Run it

Needs **Node 22.17 or newer** (it uses Node's built-in SQLite, so there is
nothing native to compile).

```sh
cd golf-gapping
npm install
npm run build
npm start            # http://<this-computer's-ip>:3000
```

Then open `http://<this-computer's-ip>:3000` on your phone (same Wi-Fi).
Find the IP with `ipconfig getifaddr en0` (Mac), `hostname -I` (Linux) or
`ipconfig` (Windows).

| Setting   | Default        | What it does                 |
| --------- | -------------- | ---------------------------- |
| `PORT`    | `3000`         | Port to listen on            |
| `HOST`    | `0.0.0.0`      | Interface to listen on       |
| `GOLF_DB` | `data/golf.db` | Where the SQLite file lives  |

For development with hot reload: `npm run dev`. Tests: `npm test`.

**Your data** is the single file `data/golf.db` (plus `-wal`/`-shm` siblings
while running). Back it up by copying it. Delete it to start over — both bags
are re-seeded on next start.

## Put it on your home screen

- **iPhone (Safari):** Share → *Add to Home Screen*. Opens full-screen with
  its own icon.
- **Android (Chrome):** ⋮ → *Add to Home screen*.

One honest caveat: browsers only treat a site as a fully installable PWA
(service worker, Chrome's "Install app" prompt) over HTTPS or on `localhost`.
Over plain `http://192.168.x.x` the home-screen shortcut above still works on
both platforms and iOS still opens it standalone; Android may show it in a
browser tab. If that bothers you, put it behind HTTPS (e.g. Tailscale Serve or
Caddy with a local cert).

## What works today

- **Sessions** – date, location (sim / range / course), ball, demo/fitting flag.
- **Shot entry** – tap a club, type carry, hit Enter. The club stays selected
  and the keyboard stays up. Total, ball speed, launch, club speed, spin and
  offline (L/R) are optional and tucked behind "+ Total, speed, launch…".
  Spin is never required.
- **Gapping** – every club in the active bag by trimmed-mean carry, longest
  first. Gaps over 15 yd and clubs within 6 yd are flagged. Switch between
  Current and Planned 2027 at the top.
- **Bags** – rename clubs, set lofts, reorder, add, remove. A club can sit in
  more than one bag (the mini driver and putter do) and its shots follow it.

Outlier trimming: drop the shortest and longest 10% by carry (only kicks in at
10+ shots), then drop anything more than 2 standard deviations from the median.

Logging a demo or fitting against a club you don't own yet: in the session,
switch the club buttons to *Planned 2027* and log as usual. The numbers show up
on the Planned gapping ladder.

## Not built yet

Rapsodo CSV import, per-club stats page (30-day vs all-time), wedge chart,
CSV export, round logging.

## Exporting from the Rapsodo MLM2PRO app

(For the upcoming import. Menu names move around between app versions — treat
this as a guide.)

1. Open the Rapsodo Golf (MLM2PRO) app and go to your session history.
2. Open the session you want.
3. Tap the share/export icon and choose **Export CSV** (shot data export
   generally needs an active Rapsodo premium membership).
4. Send the file to yourself (AirDrop, Files, email).

The same sessions can also be exported from Rapsodo's R-Cloud website on a
computer, which is easier for several sessions at once.
