# Lofi Studio

Personal lofi workspace: curated SoundCloud stations, an ambient mixer, a focus timer, tasks and sticky notes, over living wallpapers.

Live: https://lofi.samuelvanderhoeven.fr

## Features

- **Music**: six curated stations plus any SoundCloud playlist link. Custom now-playing card with artwork, seek bar, shuffle and volume. Media keys supported where the browser allows it.
- **Instant start**: the playlist metadata is read before playing and only tracks the embedded player can actually stream are queued (see below).
- **Ambience**: rain, fireplace, jungle, ocean, city and brown noise, mixed with Web Audio for gapless loops. One-click presets (Rainy night, Seaside, Cabin, City café, Deep focus). The last mix resumes on the first click.
- **Focus**: Pomodoro timer with focus, short and long breaks, automatic chaining, a chime, optional desktop notification, a daily session counter and the countdown in the tab title.
- **Notes**: a task list and a draggable sticky-note board, saved in localStorage (older notes are kept).
- **Scenes**: 19 wallpapers, animated or still, with a dim control. The accent colour is picked from the wallpaper.
- **Zen mode** (`Z`): only the clock remains, the interface shows up again when the mouse moves.
- **Keyboard shortcuts**: press `?` in the app.
- **PWA**: installable, with an offline shell (videos and SoundCloud are never cached by the service worker).

## Why some tracks are skipped

Many lofi tracks on SoundCloud are `AD_SUPPORTED` and only exist as encrypted HLS streams. The embedded widget cannot play them, so it used to skip them one by one, which could take 30 to 40 seconds before any music started. The app now filters them out from the playlist metadata, drives the widget with `skip(index)`, and drops any track that stays silent for 9 seconds.

Playable tracks per station, as tested in November 2026: Chill Lofi 286/470, Lofi Hip Hop 220/400, Jazz Hop Radio 180/295, Jazz Hop Beats 40/61, Chill Selection 41/336, Sleep Lofi 35/235.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 (the service worker only registers over HTTPS).

## Customize

- Stations: edit the `STATIONS` array in `static/script.js`.
- Wallpapers: add `static/video/<name>.mp4`, `static/image/<name>-001.jpg`, `static/thumb/<name>.jpg` and an entry in `SCENES`.
- Ambient sounds: add an mp3 in `static/son/` and an entry in `AMBIENTS`.
- After changing the shell files, bump `VERSION` in `sw.js`.
