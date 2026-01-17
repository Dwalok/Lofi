# Lofi Studio

Personal lofi workspace: pick a playlist, mix ambient sounds, take notes, run a focus timer, and swap the video wallpaper.

Live: https://lofi.samuelvanderhoeven.fr

## Features

- SoundCloud playlist picker with custom link support
- Ambient mixer with independent volume sliders
- Sticky notes board saved in localStorage
- Focus timer with presets and custom minutes
- Video wallpaper switcher
- Centralized volume panel

## Run locally

Option 1: open `index.html` directly.

Option 2: serve it for a cleaner SoundCloud experience:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Customize

- Playlists: edit the options in `index.html` or paste a SoundCloud playlist link in the UI.
- Ambient sounds: update the `audio` tags in `index.html` and keep the `data-volume-for` values in sync.
- Wallpapers: update the buttons in `index.html` and the files in `static/video` and `static/image`.
- Styling: tweak the CSS variables in `static/style.css`.

## Tech

HTML, CSS, JavaScript, SoundCloud Widget API, Font Awesome, Google Fonts.

## Credits

- SoundCloud player and playlists.
- Ambient samples from https://www.soundjay.com
