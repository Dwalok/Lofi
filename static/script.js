/* Lofi Studio — app script */
(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const body = document.body;

    /* ---------- Storage (never throws) ---------- */
    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(`lofi:${key}`);
                return raw === null ? fallback : JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(`lofi:${key}`, JSON.stringify(value));
            } catch { /* storage unavailable */ }
        }
    };

    /* ---------- Helpers ---------- */
    const fmt = ms => {
        const s = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
    };
    const fmtTimer = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    const icon = (id, el) => {
        const use = el.querySelector('use');
        if (use) {
            use.setAttribute('href', `#${id}`);
        }
    };
    const paintRange = input => {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min)) * 100}%`);
    };
    document.addEventListener('input', e => {
        if (e.target.matches('input[type="range"]')) {
            paintRange(e.target);
        }
    });

    let toastTimer = null;
    const toast = message => {
        const el = $('#toast');
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
    };

    let focusTitle = '';
    let currentTitle = '';
    const renderDocTitle = () => {
        const parts = [];
        if (focusTitle) {
            parts.push(focusTitle);
        }
        if (currentTitle) {
            parts.push(`♪ ${currentTitle}`);
        }
        parts.push('Lofi Studio');
        document.title = parts.join(' · ');
    };

    /* ---------- Clock ---------- */
    const clockEl = $('#clock');
    const dateEl = $('#date');
    const greetingEl = $('#greeting');
    const tickClock = () => {
        const now = new Date();
        clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        dateEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
        const h = now.getHours();
        greetingEl.textContent = h < 5 ? 'Late night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    };
    tickClock();
    setInterval(tickClock, 5000);

    /* ---------- Sheets ---------- */
    const sheets = $$('[data-sheet]');
    let openSheet = null;

    const closeSheets = () => {
        sheets.forEach(s => s.classList.remove('is-open'));
        $$('.dock-tool').forEach(b => b.classList.remove('is-active'));
        body.classList.remove('sheet-open');
        openSheet = null;
    };

    const toggleSheet = name => {
        const sheet = $(`#sheet-${name}`);
        if (!sheet) {
            return;
        }
        const wasOpen = openSheet === name;
        closeSheets();
        if (wasOpen) {
            return;
        }
        sheet.classList.add('is-open');
        body.classList.add('sheet-open');
        $$(`.dock-tool[data-open="${name}"]`).forEach(b => b.classList.add('is-active'));
        openSheet = name;
        document.dispatchEvent(new CustomEvent('sheet:open', { detail: name }));
    };

    document.addEventListener('click', e => {
        const opener = e.target.closest('[data-open]');
        if (opener) {
            toggleSheet(opener.dataset.open);
            return;
        }
        if (e.target.closest('[data-close]')) {
            closeSheets();
            return;
        }
        // a detached target was re-rendered inside a sheet: not an outside click
        if (openSheet && e.target.isConnected && !e.target.closest('[data-sheet], .dock, .topbar, .toast')) {
            closeSheets();
        }
    });

    /* ---------- Scenes ---------- */
    const SCENES = [
        ['Lofi-Van-Life-Moewalls-Com2', 'Van life'],
        ['Garden-House-Lofi-Rainy-Day-Moewalls-Com', 'Rainy garden'],
        ['Lofi-Girl-Autumn-Afternoon-Moewalls-Com', 'Autumn desk'],
        ['Lofi-Boy-Camping-Car-Raining-Moewalls-Com', 'Camping rain'],
        ['Lofi-House-Cloudy-Day-Moewalls-Com', 'Cloudy house'],
        ['Winter-Bus-Pixel-Moewalls-Com', 'Winter bus'],
        ['Night-Drive-Galaxy-Moewalls-Com', 'Night drive'],
        ['Pixel-Girl-Smoking-Night-City-Cyberpunk-Moewalls-Com', 'Neon city'],
        ['Lonely-Lofi-Boy-Aesthetic-Moewalls-Com', 'Lonely evening'],
        ['Jake-Listening-To-Music-In-The-Rain-Adventure-Time-Moewalls-Com', 'Jake in the rain'],
        ['Star-Wars-Ghibli-Style-Moewalls-Com', 'Ghibli galaxy'],
        ['Pirate-Ship-Golden-Field-Minecraft-Moewalls-Com', 'Golden field'],
        ['Hornet-Green-Cave-Hollow-Knight-Silksong-Moewalls-Com', 'Green cave'],
        ['Chill-Mario-Pixel-Moewalls-Com', 'Pixel plumber'],
        ['Chalet', 'Chalet'],
        ['Houses', 'Houses'],
        ['City', 'City'],
        ['Fille', 'Study girl'],
        ['Alien', 'Deep space']
    ].map(([file, name]) => ({
        file,
        name,
        video: `static/video/${file}.mp4`,
        image: `static/image/${file}-001.jpg`,
        thumb: `static/thumb/${file}.jpg`
    }));

    const backdropImage = $('#backdrop-image');
    const backdropVideo = $('#backdrop-video');
    const sceneGrid = $('#scene-grid');
    const motionToggle = $('#motion-toggle');
    const dimRange = $('#dim-range');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    const smallScreen = window.matchMedia('(max-width: 640px)').matches;

    let sceneIndex = clamp(SCENES.findIndex(s => s.file === store.get('scene', SCENES[0].file)), 0, SCENES.length - 1);
    let motion = store.get('motion', !(reducedMotion || saveData || smallScreen));

    const setAccentFrom = src => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = 24;
                c.height = 16;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, 24, 16);
                const data = ctx.getImageData(0, 0, 24, 16).data;
                let best = null;
                let bestScore = -1;
                for (let i = 0; i < data.length; i += 4) {
                    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const sat = max ? (max - min) / max : 0;
                    const light = (max + min) / 510;
                    const score = sat * (1 - Math.abs(light - 0.55) * 1.4);
                    if (score > bestScore) {
                        bestScore = score;
                        best = [r, g, b];
                    }
                }
                if (!best) {
                    return;
                }
                // lift towards a readable, luminous accent
                const max = Math.max(...best) || 1;
                const scale = 235 / max;
                const lifted = best.map(v => Math.round(clamp(v * scale * 0.85 + 40, 60, 250)));
                document.documentElement.style.setProperty('--accent-rgb', lifted.join(' '));
                const meta = $('meta[name="theme-color"]');
                if (meta) {
                    meta.setAttribute('content', `rgb(${best.map(v => Math.round(v * 0.25)).join(',')})`);
                }
            } catch { /* canvas blocked */ }
        };
        img.src = src;
    };

    const applyScene = () => {
        const scene = SCENES[sceneIndex];
        backdropImage.style.backgroundImage = `url("${scene.image}")`;
        setAccentFrom(scene.thumb);
        $$('.scene', sceneGrid).forEach((el, i) => el.classList.toggle('is-active', i === sceneIndex));
        if (motion) {
            backdropVideo.classList.remove('is-visible');
            backdropVideo.src = scene.video;
            backdropVideo.play().catch(() => {});
        } else {
            backdropVideo.classList.remove('is-visible');
            backdropVideo.removeAttribute('src');
            backdropVideo.load();
        }
        store.set('scene', scene.file);
    };

    backdropVideo.addEventListener('playing', () => backdropVideo.classList.add('is-visible'));

    SCENES.forEach((scene, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scene';
        btn.innerHTML = `<img src="${scene.thumb}" alt="" loading="lazy" decoding="async"><span>${scene.name}</span>`;
        btn.setAttribute('aria-label', scene.name);
        btn.addEventListener('click', () => {
            sceneIndex = i;
            applyScene();
        });
        sceneGrid.appendChild(btn);
    });

    const cycleScene = step => {
        sceneIndex = (sceneIndex + step + SCENES.length) % SCENES.length;
        applyScene();
        toast(SCENES[sceneIndex].name);
    };

    motionToggle.checked = motion;
    motionToggle.addEventListener('change', () => {
        motion = motionToggle.checked;
        store.set('motion', motion);
        applyScene();
    });

    const setDim = v => {
        document.documentElement.style.setProperty('--dim', String(v / 100));
        dimRange.value = v;
        paintRange(dimRange);
    };
    setDim(store.get('dim', 25));
    dimRange.addEventListener('input', () => {
        setDim(Number(dimRange.value));
        store.set('dim', Number(dimRange.value));
    });

    // pause the video when the tab is hidden: saves battery
    document.addEventListener('visibilitychange', () => {
        if (!motion) {
            return;
        }
        if (document.hidden) {
            backdropVideo.pause();
        } else {
            backdropVideo.play().catch(() => {});
        }
    });

    applyScene();

    /* ---------- Music engine (SoundCloud widget) ---------- */
    /*
     * Why the queue exists: many lofi tracks on SoundCloud are "AD_SUPPORTED"
     * (encrypted HLS only). The embedded widget cannot stream them, so it skips
     * them one by one, which can take tens of seconds before anything plays.
     * We read the playlist metadata, keep only streamable tracks and drive the
     * widget with skip(index) ourselves.
     */
    const STATIONS = [
        { id: 'chill', name: 'Chill Lofi', mood: 'Mellow beats, long sessions', url: 'https://soundcloud.com/user-636346752/sets/lofi-chill', swatch: 'linear-gradient(135deg,#f2a25c,#7a4fd6)' },
        { id: 'hiphop', name: 'Lofi Hip Hop', mood: 'Dusty drums, warm keys', url: 'https://soundcloud.com/dzcnczlv19sy/sets/lofi-hip-hop', swatch: 'linear-gradient(135deg,#ff7a6b,#3a2f6b)' },
        { id: 'jazz', name: 'Jazz Hop Radio', mood: 'Chillhop, jazzy samples', url: 'https://soundcloud.com/komplextrus/sets/chillhop-radio-jazz-lofi-hip', swatch: 'linear-gradient(135deg,#e8c27a,#2c6e63)' },
        { id: 'jazzhop', name: 'Jazz Hop Beats', mood: 'Short, smooth and bright', url: 'https://soundcloud.com/chill-playlister/sets/lofi-jazz-hop-lo-fi-beats', swatch: 'linear-gradient(135deg,#9ad1c8,#41507a)' },
        { id: 'selection', name: 'Chill Selection', mood: 'The original Lofi Studio mix', url: 'https://api.soundcloud.com/playlists/1746424434', swatch: 'linear-gradient(135deg,#f5d2a0,#b5546a)' },
        { id: 'sleep', name: 'Sleep Lofi', mood: 'Lofi Girl, slow and soft', url: 'https://soundcloud.com/lofi_girl/sets/sleep-lofi', swatch: 'linear-gradient(135deg,#8fa4ff,#1d2240)' }
    ];

    const iframe = $('#sc-player');
    const stationList = $('#station-list');
    const queueNote = $('#queue-note');
    const seek = $('#seek');
    const shuffleButton = $('#shuffle-button');
    const playButtons = $$('[data-action="toggle"]');
    const musicSliders = $$('[data-volume="music"]');

    const WIDGET_PARAMS = 'auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false&buying=false&sharing=false&download=false';

    const music = {
        widget: null,
        ready: false,
        loadToken: 0,
        station: null,
        sounds: [],
        playable: [],
        playableSet: new Set(),
        bad: new Set(),
        current: -1,
        history: [],
        playing: false,
        wantPlay: false,
        finishing: false,
        audible: false,
        watchdog: null,
        nudge: null,
        confirming: false,
        duration: 0,
        volume: clamp(store.get('volume', 70), 0, 100),
        muted: false,
        shuffle: store.get('shuffle', true),
        custom: store.get('customStation', null),
        log: []
    };

    const dbg = (...a) => {
        music.log.push(`${(performance.now() / 1000).toFixed(1)} ${a.join(' ')}`);
        if (music.log.length > 300) {
            music.log.shift();
        }
    };

    const allStations = () => (music.custom ? [...STATIONS, music.custom] : STATIONS);

    const isStreamable = sound => {
        if (!sound || sound.playable === false) {
            return false;
        }
        if (sound.policy === 'BLOCK' || sound.policy === 'SNIP') {
            return false;
        }
        // full metadata: trust the stream list (encrypted HLS cannot play in the embed)
        const transcodings = sound.media && sound.media.transcodings;
        if (Array.isArray(transcodings) && transcodings.length) {
            return transcodings.some(t => t.format && !t.snipped
                && (t.format.protocol === 'hls' || t.format.protocol === 'progressive'));
        }
        // partial metadata: ad-supported tracks are almost always encrypted-only
        return sound.monetization_model !== 'AD_SUPPORTED';
    };

    const setLoading = on => playButtons.forEach(b => b.classList.toggle('is-loading', on));

    const setPlayingUI = playing => {
        music.playing = playing;
        body.classList.toggle('is-playing', playing);
        playButtons.forEach(b => {
            icon(playing ? 'i-pause' : 'i-play', b);
            b.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        });
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
        }
        updateTitle();
    };

    const renderStations = () => {
        stationList.innerHTML = '';
        allStations().forEach(st => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `station${st.custom ? ' is-custom' : ''}${music.station && music.station.id === st.id ? ' is-active' : ''}`;
            btn.innerHTML = `
                <span class="station-swatch" style="--swatch:${st.swatch || 'var(--accent)'}"></span>
                <span><span class="station-name"></span><span class="station-mood"></span></span>
                <span class="station-count"></span>`;
            btn.querySelector('.station-name').textContent = st.name;
            btn.querySelector('.station-mood').textContent = st.mood;
            btn.querySelector('.station-count').textContent = st.count ? `${st.count} tracks` : '';
            btn.addEventListener('click', () => selectStation(st.id, music.playing || music.wantPlay));
            stationList.appendChild(btn);
        });
    };

    const setVolume = v => {
        music.volume = clamp(Math.round(v), 0, 100);
        musicSliders.forEach(s => {
            s.value = music.volume;
            paintRange(s);
        });
        if (music.widget && music.ready) {
            music.widget.setVolume(music.muted ? 0 : music.volume);
        }
        store.set('volume', music.volume);
    };

    const updateMeta = sound => {
        if (!sound) {
            return;
        }
        const title = sound.title || 'Untitled';
        const artist = (sound.user && sound.user.username) || (sound.publisher_metadata && sound.publisher_metadata.artist) || 'SoundCloud';
        const art = (sound.artwork_url || (sound.user && sound.user.avatar_url) || '').replace('-large', '-t300x300');
        music.duration = sound.duration || sound.full_duration || 0;
        $('#now-title').textContent = title;
        $('#now-artist').textContent = artist;
        $('#dock-title').textContent = title;
        $('#dock-sub').textContent = `${artist} · ${music.station ? music.station.name : ''}`;
        $('#now-duration').textContent = fmt(music.duration);
        $('#now-link').href = sound.permalink_url || 'https://soundcloud.com';
        [$('#now-art'), $('#dock-art')].forEach(el => {
            el.style.backgroundImage = art ? `url("${art}")` : '';
            el.classList.toggle('has-art', !!art);
        });
        if ('mediaSession' in navigator && window.MediaMetadata) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                album: music.station ? music.station.name : 'Lofi Studio',
                artwork: art ? [{ src: art, sizes: '300x300', type: 'image/jpeg' }] : []
            });
        }
        updateTitle();
    };

    const updateTitle = () => {
        currentTitle = music.playing ? $('#now-title').textContent : '';
        renderDocTitle();
    };

    const pickNext = (from, direction = 1) => {
        const list = music.playable.filter(i => !music.bad.has(i));
        if (!list.length) {
            return -1;
        }
        if (music.shuffle && direction > 0) {
            const recent = new Set(music.history.slice(-Math.min(30, Math.floor(list.length / 2))));
            const pool = list.filter(i => i !== from && !recent.has(i));
            const source = pool.length ? pool : list;
            return source[Math.floor(Math.random() * source.length)];
        }
        if (direction > 0) {
            return list.find(i => i > from) ?? list[0];
        }
        const before = list.filter(i => i < from);
        return before.length ? before[before.length - 1] : list[list.length - 1];
    };

    const armWatchdog = index => {
        clearTimeout(music.watchdog);
        music.audible = false;
        music.watchdog = setTimeout(() => {
            if (music.audible || !music.wantPlay) {
                return;
            }
            // the widget is stuck on a track it cannot stream: drop it and move on
            dbg('watchdog', index);
            music.bad.add(index);
            skipTo(pickNext(index));
        }, 9000);
    };

    const skipTo = index => {
        if (!music.ready || index < 0) {
            return;
        }
        music.current = index;
        music.history.push(index);
        if (music.history.length > 200) {
            music.history.shift();
        }
        music.wantPlay = true;
        setLoading(true);
        armWatchdog(index);
        dbg('skipTo', index);
        music.widget.skip(index);
        // skip() does not always start playback (the widget may still be fetching
        // the track details), so keep nudging play() until sound comes out
        clearInterval(music.nudge);
        let tries = 0;
        music.nudge = setInterval(() => {
            tries += 1;
            if (music.audible || !music.wantPlay || music.current !== index || tries > 12) {
                clearInterval(music.nudge);
                return;
            }
            music.widget.getCurrentSoundIndex(current => {
                if (current !== index) {
                    music.widget.skip(index);
                }
                music.widget.isPaused(paused => {
                    if (paused) {
                        music.widget.play();
                    }
                });
            });
        }, 600);
        const known = music.sounds[index];
        if (known && known.title) {
            updateMeta(known);
        }
    };

    const play = () => {
        music.wantPlay = true;
        if (!music.ready) {
            setLoading(true);
            return;
        }
        if (music.current < 0 || !music.playableSet.has(music.current)) {
            skipTo(pickNext(-1));
            return;
        }
        setLoading(!music.audible);
        music.widget.play();
    };

    const pause = () => {
        music.wantPlay = false;
        clearTimeout(music.watchdog);
        setLoading(false);
        if (music.widget && music.ready) {
            music.widget.pause();
        }
    };

    const togglePlay = () => {
        if (music.playing || (music.wantPlay && music.ready)) {
            pause();
        } else {
            play();
        }
    };

    const next = () => {
        if (!music.ready) {
            return;
        }
        skipTo(pickNext(music.current, 1));
    };

    const prev = () => {
        if (!music.ready) {
            return;
        }
        music.widget.getPosition(pos => {
            if (pos > 4000) {
                music.widget.seekTo(0);
                return;
            }
            // walk back through history when shuffling
            if (music.shuffle && music.history.length > 1) {
                music.history.pop();
                const target = music.history.pop();
                skipTo(target);
                return;
            }
            skipTo(pickNext(music.current, -1));
        });
    };

    const onSoundsLoaded = (token, attempt = 0) => {
        music.widget.getSounds(sounds => {
            if (token !== music.loadToken) {
                return;
            }
            if (!sounds || !sounds.length) {
                if (attempt < 25) {
                    setTimeout(() => onSoundsLoaded(token, attempt + 1), 300);
                } else {
                    queueNote.textContent = 'This playlist could not be loaded. It may be private or removed.';
                    setLoading(false);
                    toast('Playlist unavailable');
                }
                return;
            }
            music.sounds = sounds;
            music.playable = sounds.map((s, i) => (isStreamable(s) ? i : -1)).filter(i => i >= 0);
            const skipped = sounds.length - music.playable.length;
            if (!music.playable.length) {
                // nothing we can vouch for: let the widget try them all
                music.playable = sounds.map((s, i) => (s.policy === 'BLOCK' ? -1 : i)).filter(i => i >= 0);
                queueNote.textContent = 'Most tracks here are ad-supported and may not play in the embed.';
            } else {
                queueNote.textContent = skipped
                    ? `${music.playable.length} playable tracks. ${skipped} ad-supported or blocked tracks are skipped instantly.`
                    : `${music.playable.length} tracks.`;
            }
            music.playableSet = new Set(music.playable);
            music.station.count = music.playable.length;
            renderStations();
            music.ready = true;
            setVolume(music.volume);
            const first = sounds[music.playable[0]];
            if (first && first.title && music.current < 0) {
                updateMeta(first);
            }
            if (music.wantPlay) {
                skipTo(pickNext(-1));
            } else {
                setLoading(false);
            }
        });
    };

    const bindWidget = () => {
        const E = SC.Widget.Events;
        music.widget.bind(E.READY, () => onSoundsLoaded(music.loadToken));
        music.widget.bind(E.PLAY, () => {
            if (!music.ready) {
                return;
            }
            music.widget.getCurrentSoundIndex(index => {
                dbg('PLAY', index, 'current', music.current);
                const wasFinishing = music.finishing;
                music.finishing = false;
                if (wasFinishing && (music.shuffle || !music.playableSet.has(index))) {
                    skipTo(pickNext(music.current));
                    return;
                }
                if (!music.playableSet.has(index) || music.bad.has(index)) {
                    skipTo(pickNext(index));
                    return;
                }
                if (index !== music.current) {
                    music.current = index;
                    music.history.push(index);
                    armWatchdog(index);
                }
                music.wantPlay = true;
                setPlayingUI(true);
                music.widget.getCurrentSound(updateMeta);
            });
        });
        music.widget.bind(E.PAUSE, () => {
            setPlayingUI(false);
        });
        music.widget.bind(E.FINISH, () => {
            music.finishing = true;
            setTimeout(() => {
                if (music.finishing) {
                    music.finishing = false;
                    skipTo(pickNext(music.current));
                }
            }, 1200);
        });
        music.widget.bind(E.PLAY_PROGRESS, e => {
            if (!music.ready) {
                return;
            }
            if (!music.audible && e.currentPosition > 0 && !music.confirming) {
                // ignore late progress events from the previous track
                music.confirming = true;
                music.widget.getCurrentSoundIndex(index => {
                    music.confirming = false;
                    if (index !== music.current || music.audible) {
                        return;
                    }
                    dbg('audible', index);
                    music.audible = true;
                    clearTimeout(music.watchdog);
                    setLoading(false);
                });
            }
            const ratio = music.duration ? e.currentPosition / music.duration : e.relativePosition || 0;
            $('#dock-progress-bar').style.width = `${clamp(ratio, 0, 1) * 100}%`;
            if (!seek.matches(':active')) {
                seek.value = Math.round(clamp(ratio, 0, 1) * 1000);
                paintRange(seek);
            }
            $('#now-elapsed').textContent = fmt(e.currentPosition);
        });
        music.widget.bind(E.ERROR, () => {
            dbg('ERROR', music.current);
            if (music.wantPlay && music.current >= 0) {
                music.bad.add(music.current);
                skipTo(pickNext(music.current));
            }
        });
    };

    const selectStation = (id, autoplay = false) => {
        const station = allStations().find(s => s.id === id) || STATIONS[0];
        music.station = station;
        music.loadToken += 1;
        music.ready = false;
        music.sounds = [];
        music.playable = [];
        music.playableSet = new Set();
        music.bad = new Set();
        music.current = -1;
        music.history = [];
        music.wantPlay = autoplay;
        music.finishing = false;
        music.audible = false;
        clearTimeout(music.watchdog);
        if (music.widget && music.playing) {
            music.widget.pause();
        }
        setPlayingUI(false);
        setLoading(autoplay);
        queueNote.textContent = 'Loading playlist…';
        $('#now-playlist').textContent = station.name;
        $('#now-title').textContent = 'Loading…';
        $('#now-artist').textContent = station.mood;
        $('#dock-title').textContent = station.name;
        $('#dock-sub').textContent = station.mood;
        store.set('station', station.id);
        renderStations();

        if (!window.SC || !SC.Widget) {
            queueNote.textContent = 'SoundCloud could not be reached. Check your connection or ad blocker.';
            setLoading(false);
            return;
        }
        if (!music.widget) {
            iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(station.url)}&${WIDGET_PARAMS}`;
            music.widget = SC.Widget(iframe);
            bindWidget();
            return;
        }
        const token = music.loadToken;
        music.widget.load(station.url, {
            auto_play: false,
            hide_related: true,
            show_comments: false,
            show_reposts: false,
            show_teaser: false,
            visual: false,
            callback: () => onSoundsLoaded(token)
        });
    };

    const setShuffle = on => {
        music.shuffle = on;
        shuffleButton.setAttribute('aria-pressed', String(on));
        store.set('shuffle', on);
    };

    $$('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'toggle') {
                togglePlay();
            } else if (action === 'next') {
                next();
            } else if (action === 'prev') {
                prev();
            }
        });
    });

    shuffleButton.addEventListener('click', () => {
        setShuffle(!music.shuffle);
        toast(music.shuffle ? 'Shuffle on' : 'Shuffle off');
    });

    musicSliders.forEach(s => s.addEventListener('input', () => {
        music.muted = false;
        setVolume(Number(s.value));
    }));

    seek.addEventListener('change', () => {
        if (music.ready && music.duration) {
            music.widget.seekTo((Number(seek.value) / 1000) * music.duration);
        }
    });

    $('#custom-playlist-form').addEventListener('submit', e => {
        e.preventDefault();
        const input = $('#custom-playlist-url');
        const value = input.value.trim();
        let url;
        try {
            url = new URL(value);
        } catch {
            toast('That does not look like a link');
            return;
        }
        if (!/(^|\.)soundcloud\.com$/.test(url.hostname)) {
            toast('Only SoundCloud links are supported');
            return;
        }
        music.custom = { id: 'custom', custom: true, name: 'Your playlist', mood: url.pathname.replace(/^\//, '').replace(/\/sets\//, ' · ') || 'Custom link', url: url.href };
        store.set('customStation', music.custom);
        input.value = '';
        selectStation('custom', true);
    });

    if ('mediaSession' in navigator) {
        const handlers = { play, pause, nexttrack: next, previoustrack: prev };
        Object.entries(handlers).forEach(([action, fn]) => {
            try {
                navigator.mediaSession.setActionHandler(action, fn);
            } catch { /* unsupported action */ }
        });
    }

    setShuffle(music.shuffle);
    setVolume(music.volume);

    const initMusic = (attempt = 0) => {
        if (window.SC && SC.Widget) {
            selectStation(store.get('station', STATIONS[0].id));
            return;
        }
        if (attempt < 20) {
            setTimeout(() => initMusic(attempt + 1), 250);
            return;
        }
        renderStations();
        queueNote.textContent = 'SoundCloud could not be reached. Check your connection or ad blocker.';
    };
    initMusic();

    /* ---------- Ambience (Web Audio, gapless loops) ---------- */
    const AMBIENTS = [
        { id: 'rain', name: 'Rain', desc: 'Steady downpour', file: 'static/son/pluie.mp3', icon: 'i-rain' },
        { id: 'fire', name: 'Fireplace', desc: 'Warm crackle', file: 'static/son/Feu.mp3', icon: 'i-fire' },
        { id: 'forest', name: 'Jungle', desc: 'Birds and leaves', file: 'static/son/jungle.mp3', icon: 'i-forest' },
        { id: 'waves', name: 'Ocean', desc: 'Slow tide', file: 'static/son/vagues.mp3', icon: 'i-waves' },
        { id: 'city', name: 'City', desc: 'Distant traffic', file: 'static/son/urban.mp3', icon: 'i-city' },
        { id: 'brown', name: 'Brown noise', desc: 'Deep focus hum', file: 'static/son/brown.mp3', icon: 'i-noise' }
    ];
    const PRESETS = [
        { name: 'Rainy night', mix: { rain: 55, fire: 35 } },
        { name: 'Seaside', mix: { waves: 60, forest: 15 } },
        { name: 'Cabin', mix: { fire: 50, forest: 25 } },
        { name: 'City café', mix: { city: 40, rain: 20 } },
        { name: 'Deep focus', mix: { brown: 45 } }
    ];

    const ambientGrid = $('#ambient-grid');
    const presetRow = $('#mix-presets');
    const ambientBadge = $('#ambient-badge');
    const savedMix = store.get('mix', {});
    let audioCtx = null;
    let master = null;
    const amb = new Map();

    const ensureCtx = () => {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
            master = audioCtx.createGain();
            master.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    };

    const loadBuffer = async item => {
        if (item.buffer) {
            return item.buffer;
        }
        if (!item.loading) {
            item.loading = fetch(item.file)
                .then(r => r.arrayBuffer())
                .then(data => new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject)))
                .then(buffer => {
                    item.buffer = buffer;
                    return buffer;
                });
        }
        return item.loading;
    };

    const saveMix = () => {
        const mix = {};
        amb.forEach((item, id) => {
            mix[id] = { v: item.volume, on: item.on };
        });
        store.set('mix', mix);
    };

    const refreshAmbientUI = item => {
        item.el.classList.toggle('is-on', item.on);
        item.slider.value = item.volume;
        paintRange(item.slider);
        item.toggle.setAttribute('aria-pressed', String(item.on));
        const active = Array.from(amb.values()).filter(a => a.on).length;
        ambientBadge.hidden = active === 0;
        ambientBadge.textContent = String(active);
    };

    const startAmbient = async item => {
        ensureCtx();
        item.on = true;
        refreshAmbientUI(item);
        if (item.source) {
            item.gain.gain.setTargetAtTime(item.volume / 100, audioCtx.currentTime, 0.25);
            return;
        }
        item.el.classList.add('is-loading');
        try {
            const buffer = await loadBuffer(item);
            if (!item.on || item.source) {
                return;
            }
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            item.gain = item.gain || audioCtx.createGain();
            item.gain.gain.value = 0;
            item.gain.connect(master);
            source.connect(item.gain);
            // random start so layered loops never line up
            source.start(0, Math.random() * buffer.duration);
            item.gain.gain.setTargetAtTime(item.volume / 100, audioCtx.currentTime, 0.4);
            item.source = source;
        } catch {
            item.on = false;
            toast(`Could not load ${item.name}`);
        } finally {
            item.el.classList.remove('is-loading');
            refreshAmbientUI(item);
        }
    };

    const stopAmbient = item => {
        item.on = false;
        refreshAmbientUI(item);
        if (!item.source) {
            return;
        }
        const source = item.source;
        item.source = null;
        item.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        setTimeout(() => {
            try {
                source.stop();
            } catch { /* already stopped */ }
        }, 900);
    };

    const setAmbientVolume = (item, v) => {
        item.volume = clamp(Math.round(v), 0, 100);
        if (item.volume === 0) {
            stopAmbient(item);
        } else if (!item.on) {
            startAmbient(item);
        } else if (item.gain && audioCtx) {
            item.gain.gain.setTargetAtTime(item.volume / 100, audioCtx.currentTime, 0.1);
        }
        refreshAmbientUI(item);
        saveMix();
    };

    AMBIENTS.forEach(def => {
        const el = document.createElement('div');
        el.className = 'ambient';
        el.innerHTML = `
            <button type="button" class="ambient-top" aria-pressed="false">
                <span class="ambient-icon"><svg><use href="#${def.icon}"/></svg></span>
                <span><span class="ambient-name"></span><br><span class="ambient-desc"></span></span>
            </button>
            <input type="range" min="0" max="100" aria-label="${def.name} volume">`;
        el.querySelector('.ambient-name').textContent = def.name;
        el.querySelector('.ambient-desc').textContent = def.desc;
        const item = {
            ...def,
            el,
            toggle: el.querySelector('.ambient-top'),
            slider: el.querySelector('input'),
            volume: (savedMix[def.id] && savedMix[def.id].v) || 40,
            on: false,
            buffer: null,
            source: null,
            gain: null
        };
        item.toggle.addEventListener('click', () => {
            if (item.on) {
                stopAmbient(item);
            } else {
                if (item.volume === 0) {
                    item.volume = 40;
                }
                startAmbient(item);
            }
            highlightPreset();
            saveMix();
        });
        item.slider.addEventListener('input', () => {
            setAmbientVolume(item, Number(item.slider.value));
            highlightPreset();
        });
        amb.set(def.id, item);
        ambientGrid.appendChild(el);
        refreshAmbientUI(item);
    });

    const highlightPreset = () => {
        $$('.chip', presetRow).forEach((chip, i) => {
            const mix = PRESETS[i].mix;
            const match = Array.from(amb.values()).every(a => (mix[a.id] ? a.on && a.volume === mix[a.id] : !a.on));
            chip.classList.toggle('is-active', match);
        });
    };

    PRESETS.forEach(preset => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = preset.name;
        chip.addEventListener('click', () => {
            const isActive = chip.classList.contains('is-active');
            amb.forEach(item => {
                if (!isActive && preset.mix[item.id]) {
                    item.volume = preset.mix[item.id];
                    startAmbient(item);
                } else if (item.on) {
                    stopAmbient(item);
                }
                refreshAmbientUI(item);
            });
            highlightPreset();
            saveMix();
        });
        presetRow.appendChild(chip);
    });

    const stopAllAmbient = () => {
        amb.forEach(item => item.on && stopAmbient(item));
        highlightPreset();
        saveMix();
    };
    $('#ambient-stop').addEventListener('click', stopAllAmbient);

    // offer to resume last mix after the first user gesture (autoplay rules)
    const resumable = Object.entries(savedMix).filter(([, v]) => v && v.on).map(([id]) => id);
    if (resumable.length) {
        const resume = () => {
            resumable.forEach(id => amb.get(id) && startAmbient(amb.get(id)));
            highlightPreset();
        };
        document.addEventListener('pointerdown', resume, { once: true });
    }

    let mutedAll = false;
    const toggleMuteAll = () => {
        mutedAll = !mutedAll;
        music.muted = mutedAll;
        setVolume(music.volume);
        if (audioCtx && master) {
            master.gain.setTargetAtTime(mutedAll ? 0 : 1, audioCtx.currentTime, 0.1);
        }
        toast(mutedAll ? 'Muted' : 'Sound on');
    };

    /* ---------- Focus timer ---------- */
    const RING = 2 * Math.PI * 54;
    const ringFill = $('#ring-fill');
    const focusTime = $('#focus-time');
    const focusState = $('#focus-state');
    const focusStart = $('#focus-start');
    const heroFocus = $('#hero-focus');
    const statusPill = $('#status-pill');
    const durInputs = { focus: $('#dur-focus'), short: $('#dur-short'), long: $('#dur-long') };
    const autoInput = $('#focus-auto');
    const notifyInput = $('#focus-notify');
    const MODE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

    const focusSettings = store.get('focus', { focus: 25, short: 5, long: 15, auto: true, notify: false });
    Object.entries(durInputs).forEach(([k, input]) => {
        input.value = focusSettings[k];
    });
    autoInput.checked = focusSettings.auto;
    notifyInput.checked = focusSettings.notify && 'Notification' in window && Notification.permission === 'granted';

    const today = new Date().toDateString();
    const countStore = store.get('focusCount', { day: today, n: 0 });
    if (countStore.day !== today) {
        countStore.day = today;
        countStore.n = 0;
    }
    $('#focus-count').textContent = countStore.n;

    const timer = {
        mode: 'focus',
        total: focusSettings.focus * 60,
        remaining: focusSettings.focus * 60,
        running: false,
        endAt: 0,
        interval: null,
        cycle: 0
    };

    const saveFocusSettings = () => {
        Object.entries(durInputs).forEach(([k, input]) => {
            focusSettings[k] = clamp(parseInt(input.value, 10) || focusSettings[k], 1, Number(input.max));
            input.value = focusSettings[k];
        });
        focusSettings.auto = autoInput.checked;
        focusSettings.notify = notifyInput.checked;
        store.set('focus', focusSettings);
    };

    const renderTimer = () => {
        const sec = Math.ceil(timer.remaining);
        const text = fmtTimer(sec);
        focusTime.textContent = text;
        ringFill.style.strokeDasharray = String(RING);
        ringFill.style.strokeDashoffset = String(RING * (1 - timer.remaining / timer.total));
        const active = timer.running || timer.remaining < timer.total;
        focusState.textContent = timer.running ? MODE_LABEL[timer.mode] : active ? 'Paused' : 'Ready';
        heroFocus.hidden = !active;
        $('#hero-focus-label').textContent = timer.running ? MODE_LABEL[timer.mode] : 'Paused';
        $('#hero-focus-time').textContent = text;
        statusPill.hidden = !active;
        $('#status-text').textContent = `${MODE_LABEL[timer.mode]} ${text}`;
        icon(timer.running ? 'i-pause' : 'i-play', focusStart);
        focusStart.setAttribute('aria-label', timer.running ? 'Pause' : 'Start');
        $$('#focus-modes button').forEach(b => b.classList.toggle('is-active', b.dataset.mode === timer.mode));
        focusTitle = active ? `${text} ${MODE_LABEL[timer.mode]}` : '';
        renderDocTitle();
    };

    const chime = () => {
        try {
            const ctx = ensureCtx();
            const t = ctx.currentTime;
            [659.25, 880, 1318.5].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0, t + i * 0.18);
                g.gain.linearRampToValueAtTime(0.18, t + i * 0.18 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 1.6);
                osc.connect(g).connect(ctx.destination);
                osc.start(t + i * 0.18);
                osc.stop(t + i * 0.18 + 1.7);
            });
        } catch { /* audio unavailable */ }
    };

    const setMode = mode => {
        timer.mode = mode;
        timer.total = focusSettings[mode] * 60;
        timer.remaining = timer.total;
        renderTimer();
    };

    const stopTicking = () => {
        clearInterval(timer.interval);
        timer.running = false;
    };

    const completePhase = () => {
        stopTicking();
        chime();
        const finished = timer.mode;
        if (finished === 'focus') {
            countStore.n += 1;
            store.set('focusCount', countStore);
            $('#focus-count').textContent = countStore.n;
            timer.cycle += 1;
        }
        const nextMode = finished === 'focus' ? (timer.cycle % 4 === 0 ? 'long' : 'short') : 'focus';
        const message = finished === 'focus' ? 'Focus done. Time for a break.' : 'Break over. Back to it.';
        toast(message);
        if (focusSettings.notify && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Lofi Studio', { body: message, icon: 'static/favicon.svg', silent: true });
            } catch { /* notifications blocked */ }
        }
        setMode(nextMode);
        if (focusSettings.auto) {
            startTimer();
        }
    };

    const tick = () => {
        timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
        if (timer.remaining <= 0) {
            timer.remaining = 0;
            renderTimer();
            completePhase();
            return;
        }
        renderTimer();
    };

    function startTimer() {
        if (timer.remaining <= 0) {
            setMode(timer.mode);
        }
        ensureCtx();
        timer.running = true;
        timer.endAt = Date.now() + timer.remaining * 1000;
        clearInterval(timer.interval);
        timer.interval = setInterval(tick, 250);
        renderTimer();
    }

    const pauseTimer = () => {
        if (!timer.running) {
            return;
        }
        timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
        stopTicking();
        renderTimer();
    };

    const toggleTimer = () => (timer.running ? pauseTimer() : startTimer());

    focusStart.addEventListener('click', toggleTimer);
    $('#focus-reset').addEventListener('click', () => {
        stopTicking();
        setMode(timer.mode);
    });
    $('#focus-skip').addEventListener('click', () => {
        timer.endAt = Date.now();
        if (!timer.running) {
            timer.remaining = 0;
            completePhase();
        }
    });
    $$('#focus-modes button').forEach(b => b.addEventListener('click', () => {
        stopTicking();
        setMode(b.dataset.mode);
    }));
    Object.values(durInputs).forEach(input => input.addEventListener('change', () => {
        saveFocusSettings();
        if (!timer.running && timer.remaining === timer.total) {
            setMode(timer.mode);
        } else {
            renderTimer();
        }
    }));
    autoInput.addEventListener('change', saveFocusSettings);
    notifyInput.addEventListener('change', async () => {
        if (notifyInput.checked && 'Notification' in window && Notification.permission !== 'granted') {
            const result = await Notification.requestPermission();
            notifyInput.checked = result === 'granted';
            if (result !== 'granted') {
                toast('Notifications are blocked in this browser');
            }
        }
        saveFocusSettings();
    });

    setMode('focus');

    /* ---------- Tasks ---------- */
    const taskList = $('#task-list');
    const taskInput = $('#task-input');
    let tasks = store.get('tasks', []);

    const saveTasks = () => store.set('tasks', tasks);

    const renderTasks = () => {
        taskList.innerHTML = '';
        if (!tasks.length) {
            const li = document.createElement('li');
            li.className = 'empty';
            li.textContent = 'No tasks yet. Add one and press Enter.';
            taskList.appendChild(li);
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task${task.done ? ' is-done' : ''}`;
            li.innerHTML = `
                <button type="button" class="task-check" aria-label="Toggle done"><svg><use href="#i-check"/></svg></button>
                <span class="task-text" contenteditable="plaintext-only" spellcheck="false"></span>
                <button type="button" class="icon-button" aria-label="Delete task"><svg><use href="#i-trash"/></svg></button>`;
            const text = li.querySelector('.task-text');
            text.textContent = task.text;
            li.querySelector('.task-check').addEventListener('click', () => {
                task.done = !task.done;
                saveTasks();
                renderTasks();
            });
            text.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    text.blur();
                }
            });
            text.addEventListener('blur', () => {
                const value = text.textContent.trim();
                if (!value) {
                    tasks = tasks.filter(t => t !== task);
                    renderTasks();
                } else {
                    task.text = value;
                }
                saveTasks();
            });
            li.querySelector('.icon-button').addEventListener('click', () => {
                tasks = tasks.filter(t => t !== task);
                saveTasks();
                renderTasks();
            });
            taskList.appendChild(li);
        });
        const open = tasks.filter(t => !t.done).length;
        $('#task-count').textContent = tasks.length ? `${open} open · ${tasks.length - open} done` : '';
    };

    $('#task-form').addEventListener('submit', e => {
        e.preventDefault();
        const value = taskInput.value.trim();
        if (!value) {
            return;
        }
        tasks.push({ id: Date.now().toString(36), text: value, done: false });
        taskInput.value = '';
        saveTasks();
        renderTasks();
    });
    $('#task-clear').addEventListener('click', () => {
        tasks = tasks.filter(t => !t.done);
        saveTasks();
        renderTasks();
    });
    renderTasks();

    $$('#notes-tabs button').forEach(b => b.addEventListener('click', () => {
        $$('#notes-tabs button').forEach(x => x.classList.toggle('is-active', x === b));
        $$('.notes-view').forEach(v => {
            v.hidden = v.dataset.view !== b.dataset.tab;
        });
        store.set('notesTab', b.dataset.tab);
        if (b.dataset.tab === 'board') {
            fitNotes();
        }
    }));
    const savedTab = store.get('notesTab', 'tasks');
    if (savedTab === 'board') {
        $('#notes-tabs button[data-tab="board"]').click();
    }

    /* ---------- Sticky notes board (keeps the old "lofi-notes" data) ---------- */
    const board = $('#notes-board');
    const NOTE_COLORS = ['#f7d58b', '#f6b58e', '#a7d8c1', '#b9c7f4', '#f1e6a4', '#e9b9e0'];
    const LEGACY_KEY = 'lofi-notes';
    let noteZ = 1;

    const readNotes = () => {
        try {
            const raw = localStorage.getItem(LEGACY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const saveNotes = () => {
        const notes = $$('.note', board).map(note => ({
            id: note.dataset.id,
            text: note.querySelector('textarea').value,
            x: parseFloat(note.style.left) || 0,
            y: parseFloat(note.style.top) || 0,
            color: note.dataset.color,
            tilt: note.dataset.tilt
        }));
        try {
            localStorage.setItem(LEGACY_KEY, JSON.stringify(notes));
        } catch { /* storage unavailable */ }
    };

    const fitNotes = () => {
        requestAnimationFrame(() => {
            const w = board.clientWidth;
            const h = board.clientHeight;
            if (!w || !h) {
                return;
            }
            $$('.note', board).forEach(note => {
                note.style.left = `${clamp(parseFloat(note.style.left) || 0, 0, Math.max(0, w - note.offsetWidth))}px`;
                note.style.top = `${clamp(parseFloat(note.style.top) || 0, 0, Math.max(0, h - note.offsetHeight))}px`;
            });
        });
    };

    const enableDrag = note => {
        const header = note.querySelector('.note-header');
        let start = null;
        header.addEventListener('pointerdown', e => {
            if (e.target.closest('.note-delete')) {
                return;
            }
            start = { x: e.clientX, y: e.clientY, left: parseFloat(note.style.left) || 0, top: parseFloat(note.style.top) || 0 };
            header.setPointerCapture(e.pointerId);
            note.classList.add('dragging');
            note.style.zIndex = ++noteZ;
        });
        header.addEventListener('pointermove', e => {
            if (!start) {
                return;
            }
            const maxX = Math.max(0, board.clientWidth - note.offsetWidth);
            const maxY = Math.max(0, board.clientHeight - note.offsetHeight);
            note.style.left = `${clamp(start.left + e.clientX - start.x, 0, maxX)}px`;
            note.style.top = `${clamp(start.top + e.clientY - start.y, 0, maxY)}px`;
        });
        const end = () => {
            if (!start) {
                return;
            }
            start = null;
            note.classList.remove('dragging');
            saveNotes();
        };
        header.addEventListener('pointerup', end);
        header.addEventListener('pointercancel', end);
    };

    const createNote = (data = {}) => {
        const note = document.createElement('div');
        const offset = board.children.length * 22;
        note.className = 'note';
        note.dataset.id = data.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        note.dataset.color = data.color || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
        note.dataset.tilt = data.tilt || (Math.random() * 4 - 2).toFixed(1);
        note.style.left = `${Number.isFinite(data.x) ? data.x : 16 + (offset % 160)}px`;
        note.style.top = `${Number.isFinite(data.y) ? data.y : 16 + (offset % 100)}px`;
        note.style.setProperty('--note-color', note.dataset.color);
        note.style.setProperty('--note-tilt', `${note.dataset.tilt}deg`);
        note.style.zIndex = ++noteZ;
        note.innerHTML = `
            <div class="note-header">
                <span class="note-grip"></span>
                <button type="button" class="note-delete" aria-label="Delete note"><svg><use href="#i-close"/></svg></button>
            </div>
            <textarea placeholder="Write here…" aria-label="Note"></textarea>`;
        const textarea = note.querySelector('textarea');
        textarea.value = data.text || '';
        textarea.addEventListener('input', saveNotes);
        note.querySelector('.note-delete').addEventListener('click', () => {
            note.remove();
            saveNotes();
        });
        enableDrag(note);
        board.appendChild(note);
        return note;
    };

    readNotes().forEach(createNote);
    $('#add-note').addEventListener('click', () => {
        createNote().querySelector('textarea').focus();
        saveNotes();
        fitNotes();
    });
    $('#clear-notes').addEventListener('click', () => {
        if (!board.children.length || window.confirm('Remove every note from the board?')) {
            board.innerHTML = '';
            saveNotes();
        }
    });
    window.addEventListener('resize', fitNotes);
    document.addEventListener('sheet:open', e => {
        if (e.detail === 'notes') {
            fitNotes();
        }
    });

    /* ---------- Zen mode ---------- */
    let peekTimer = null;
    const setZen = on => {
        body.classList.toggle('zen', on);
        if (on) {
            closeSheets();
            toast('Zen mode. Press Z or Esc to leave.');
        }
    };
    $('#zen-button').addEventListener('click', () => setZen(!body.classList.contains('zen')));
    ['pointermove', 'touchstart'].forEach(evt => document.addEventListener(evt, () => {
        if (!body.classList.contains('zen')) {
            return;
        }
        body.classList.add('peek');
        clearTimeout(peekTimer);
        peekTimer = setTimeout(() => body.classList.remove('peek'), 2500);
    }, { passive: true }));

    /* ---------- Keyboard ---------- */
    const SHEET_KEYS = { 1: 'music', 2: 'ambience', 3: 'focus', 4: 'notes', 5: 'scenes' };
    document.addEventListener('keydown', e => {
        const t = e.target;
        if (e.metaKey || e.ctrlKey || e.altKey) {
            return;
        }
        if (t.closest && t.closest('input, textarea, select, [contenteditable]')) {
            if (e.key === 'Escape') {
                t.blur();
            }
            return;
        }
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        switch (key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'n':
                next();
                break;
            case 'p':
                prev();
                break;
            case 's':
                shuffleButton.click();
                break;
            case 'm':
                toggleMuteAll();
                break;
            case 'f':
                toggleTimer();
                toast(timer.running ? `${MODE_LABEL[timer.mode]} started` : 'Timer paused');
                break;
            case 'z':
                setZen(!body.classList.contains('zen'));
                break;
            case '[':
                cycleScene(-1);
                break;
            case ']':
                cycleScene(1);
                break;
            case '?':
                toggleSheet('shortcuts');
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                e.preventDefault();
                music.muted = false;
                setVolume(music.volume + (key === 'ArrowUp' ? 5 : -5));
                toast(`Music volume ${music.volume}%`);
                break;
            case 'Escape':
                if (openSheet) {
                    closeSheets();
                } else if (body.classList.contains('zen')) {
                    setZen(false);
                }
                break;
            default:
                if (SHEET_KEYS[key]) {
                    toggleSheet(SHEET_KEYS[key]);
                }
        }
    });

    $$('input[type="range"]').forEach(paintRange);

    /* ---------- Offline shell ---------- */
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }

    // exposed for automated checks only
    window.__lofi = { music, timer, amb };
})();
