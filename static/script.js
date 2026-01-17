document.addEventListener('DOMContentLoaded', () => {
    const timeElement = document.getElementById('time');

    const updateClock = () => {
        if (!timeElement) {
            return;
        }
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}`;
    };

    updateClock();
    setInterval(updateClock, 10000);

    const panels = Array.from(document.querySelectorAll('.panel[data-panel]'));
    const panelButtons = Array.from(document.querySelectorAll('.dock-button[data-target]'));

    const closePanels = () => {
        panels.forEach(panel => panel.classList.remove('panel--active'));
        panelButtons.forEach(button => button.classList.remove('active'));
    };

    panelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const targetPanel = document.getElementById(targetId);
            if (!targetPanel) {
                return;
            }
            const wasOpen = targetPanel.classList.contains('panel--active');
            closePanels();
            if (!wasOpen) {
                targetPanel.classList.add('panel--active');
                button.classList.add('active');
            }
        });
    });

    const isPanelInteraction = event => {
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        if (path.length) {
            return path.some(node => node && node.classList
                && (node.classList.contains('panel') || node.classList.contains('dock')));
        }
        return !!(event.target.closest('.panel') || event.target.closest('.dock'));
    };

    document.addEventListener('click', event => {
        if (isPanelInteraction(event)) {
            return;
        }
        closePanels();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closePanels();
        }
    });

    const videoBackground = document.querySelector('.video-background');
    const sourceElement = videoBackground ? videoBackground.querySelector('source') : null;
    const wallpaperButtons = document.querySelectorAll('.wallpaper-thumb');

    if (videoBackground && sourceElement) {
        wallpaperButtons.forEach(button => {
            button.addEventListener('click', () => {
                const videoSrc = button.dataset.videoSrc;
                if (!videoSrc) {
                    return;
                }
                sourceElement.setAttribute('src', videoSrc);
                videoBackground.load();
            });
        });
    }

    const soundcloudIframe = document.getElementById('soundcloud-player');
    const playlistSelect = document.getElementById('playlist-select');
    const customPlaylistUrl = document.getElementById('custom-playlist-url');
    const customPlaylistButton = document.getElementById('custom-playlist-button');
    const playPauseButton = document.getElementById('play-pause-button');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const musicVolumeSliders = Array.from(document.querySelectorAll('[data-volume-for="music"]'));

    const clampVolume = value => Math.min(100, Math.max(0, Number(value) || 0));

    let player = null;
    let playerReady = false;
    let currentMusicVolume = musicVolumeSliders.length ? clampVolume(musicVolumeSliders[0].value) : 80;

    const syncMusicSliders = value => {
        musicVolumeSliders.forEach(slider => {
            slider.value = value;
        });
    };

    const setMusicVolume = value => {
        const normalized = clampVolume(value);
        currentMusicVolume = normalized;
        syncMusicSliders(normalized);
        if (player && playerReady) {
            player.setVolume(normalized);
        }
    };

    const setPlayIcon = isPlaying => {
        if (!playPauseButton) {
            return;
        }
        playPauseButton.innerHTML = isPlaying
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';
    };

    if (window.SC && soundcloudIframe) {
        player = SC.Widget(soundcloudIframe);
        player.bind(SC.Widget.Events.READY, () => {
            playerReady = true;
            setMusicVolume(currentMusicVolume);
            player.isPaused(paused => setPlayIcon(!paused));
        });
        player.bind(SC.Widget.Events.PLAY, () => setPlayIcon(true));
        player.bind(SC.Widget.Events.PAUSE, () => setPlayIcon(false));
        player.bind(SC.Widget.Events.FINISH, () => setPlayIcon(false));
    }

    const loadPlaylist = url => {
        if (!player || !url) {
            return;
        }
        player.load(url, {
            auto_play: false,
            hide_related: true,
            show_comments: false,
            show_user: false,
            show_reposts: false,
            show_teaser: false,
            visual: true,
            color: 'f2a23c'
        });
        setPlayIcon(false);
        setMusicVolume(currentMusicVolume);
    };

    if (playlistSelect) {
        playlistSelect.addEventListener('change', () => {
            loadPlaylist(playlistSelect.value);
        });
    }

    if (customPlaylistButton && customPlaylistUrl) {
        customPlaylistButton.addEventListener('click', () => {
            const url = customPlaylistUrl.value.trim();
            if (!url) {
                return;
            }
            loadPlaylist(url);
            customPlaylistUrl.value = '';
        });
    }

    if (customPlaylistUrl && customPlaylistButton) {
        customPlaylistUrl.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                customPlaylistButton.click();
            }
        });
    }

    if (playPauseButton && player) {
        playPauseButton.addEventListener('click', () => {
            player.isPaused(paused => {
                if (paused) {
                    player.play();
                } else {
                    player.pause();
                }
            });
        });
    }

    if (prevButton && player) {
        prevButton.addEventListener('click', () => player.prev());
    }

    if (nextButton && player) {
        nextButton.addEventListener('click', () => player.next());
    }

    musicVolumeSliders.forEach(slider => {
        slider.addEventListener('input', event => {
            setMusicVolume(event.target.value);
        });
    });

    setMusicVolume(currentMusicVolume);

    const ambientItems = Array.from(document.querySelectorAll('.ambient-item'));
    const muteAllButton = document.getElementById('mute-all-ambient');
    const ambientVolumeSliders = Array.from(document.querySelectorAll('[data-volume-for]')).filter(
        slider => slider.dataset.volumeFor && slider.dataset.volumeFor !== 'music'
    );
    const ambientGroups = new Map();

    const setAmbientState = (item, isPlaying) => {
        if (!item) {
            return;
        }
        item.classList.toggle('is-playing', isPlaying);
        const toggle = item.querySelector('.ambient-toggle');
        if (toggle) {
            toggle.innerHTML = isPlaying
                ? '<i class="fas fa-pause"></i>'
                : '<i class="fas fa-play"></i>';
        }
    };

    ambientItems.forEach(item => {
        const soundName = item.dataset.sound;
        const audio = document.getElementById(`ambient-${soundName}`);
        if (!audio) {
            return;
        }
        const group = ambientGroups.get(soundName) || { audio, sliders: [], item: null, toggle: null };
        group.audio = audio;
        group.item = item;
        group.toggle = item.querySelector('.ambient-toggle');
        ambientGroups.set(soundName, group);
    });

    ambientVolumeSliders.forEach(slider => {
        const soundName = slider.dataset.volumeFor;
        const audio = document.getElementById(`ambient-${soundName}`);
        if (!audio) {
            return;
        }
        const group = ambientGroups.get(soundName) || { audio, sliders: [], item: null, toggle: null };
        group.audio = audio;
        group.sliders.push(slider);
        ambientGroups.set(soundName, group);
    });

    const syncAmbientSliders = (group, value) => {
        group.sliders.forEach(slider => {
            slider.value = value;
        });
    };

    const setAmbientVolume = (group, value, shouldPlay = true) => {
        const normalized = clampVolume(value);
        syncAmbientSliders(group, normalized);
        group.audio.volume = normalized / 100;

        if (normalized === 0) {
            group.audio.pause();
            setAmbientState(group.item, false);
            return;
        }

        if (shouldPlay) {
            group.audio.play().catch(() => {});
            setAmbientState(group.item, true);
            return;
        }

        setAmbientState(group.item, !group.audio.paused);
    };

    ambientGroups.forEach(group => {
        const initialValue = group.sliders.length ? clampVolume(group.sliders[0].value) : 0;
        syncAmbientSliders(group, initialValue);
        group.audio.loop = true;
        group.audio.volume = initialValue / 100;
        setAmbientState(group.item, false);

        group.sliders.forEach(slider => {
            slider.addEventListener('input', event => {
                setAmbientVolume(group, event.target.value, true);
            });
        });

        if (group.toggle) {
            group.toggle.addEventListener('click', () => {
                const sliderValue = group.sliders.length ? clampVolume(group.sliders[0].value) : 0;
                if (group.audio.paused) {
                    const nextValue = sliderValue === 0 ? 35 : sliderValue;
                    setAmbientVolume(group, nextValue, true);
                } else {
                    group.audio.pause();
                    setAmbientState(group.item, false);
                }
            });
        }
    });

    if (muteAllButton) {
        muteAllButton.addEventListener('click', () => {
            ambientGroups.forEach(group => {
                setAmbientVolume(group, 0, false);
            });
        });
    }

    const notesBoard = document.getElementById('notes-board');
    const addNoteButton = document.getElementById('add-note');
    const clearNotesButton = document.getElementById('clear-notes');
    const noteStorageKey = 'lofi-notes';
    const noteColors = ['#f7d58b', '#f6b58e', '#a7d8c1', '#b9c7f4', '#f1e6a4'];
    let noteZIndex = 1;

    const saveNotes = () => {
        if (!notesBoard) {
            return;
        }
        const notes = Array.from(notesBoard.querySelectorAll('.note')).map(note => {
            const textarea = note.querySelector('textarea');
            return {
                id: note.dataset.id,
                text: textarea ? textarea.value : '',
                x: parseFloat(note.style.left) || 0,
                y: parseFloat(note.style.top) || 0,
                color: note.dataset.color || '',
                tilt: note.dataset.tilt || '0'
            };
        });
        localStorage.setItem(noteStorageKey, JSON.stringify(notes));
    };

    const enableDrag = note => {
        const header = note.querySelector('.note-header');
        if (!header || !notesBoard) {
            return;
        }
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        let dragging = false;

        const onPointerMove = event => {
            if (!dragging) {
                return;
            }
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            const boardRect = notesBoard.getBoundingClientRect();
            const maxX = Math.max(0, boardRect.width - note.offsetWidth);
            const maxY = Math.max(0, boardRect.height - note.offsetHeight);
            const nextX = Math.min(Math.max(originX + dx, 0), maxX);
            const nextY = Math.min(Math.max(originY + dy, 0), maxY);
            note.style.left = `${nextX}px`;
            note.style.top = `${nextY}px`;
        };

        const onPointerUp = event => {
            if (!dragging) {
                return;
            }
            dragging = false;
            header.releasePointerCapture(event.pointerId);
            note.classList.remove('dragging');
            saveNotes();
        };

        header.addEventListener('pointerdown', event => {
            dragging = true;
            header.setPointerCapture(event.pointerId);
            startX = event.clientX;
            startY = event.clientY;
            originX = parseFloat(note.style.left) || 0;
            originY = parseFloat(note.style.top) || 0;
            note.classList.add('dragging');
            note.style.zIndex = ++noteZIndex;
        });

        header.addEventListener('pointermove', onPointerMove);
        header.addEventListener('pointerup', onPointerUp);
        header.addEventListener('pointercancel', onPointerUp);
    };

    const createNote = data => {
        if (!notesBoard) {
            return;
        }
        const note = document.createElement('div');
        const id = data?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const color = data?.color || noteColors[Math.floor(Math.random() * noteColors.length)];
        const tilt = data?.tilt || (Math.random() * 4 - 2).toFixed(1);
        const offset = notesBoard.children.length * 18;
        const x = Number.isFinite(data?.x) ? data.x : 16 + (offset % 120);
        const y = Number.isFinite(data?.y) ? data.y : 16 + (offset % 80);

        note.className = 'note';
        note.dataset.id = id;
        note.dataset.color = color;
        note.dataset.tilt = tilt;
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;
        note.style.setProperty('--note-color', color);
        note.style.setProperty('--note-tilt', `${tilt}deg`);
        note.innerHTML = `
            <div class="note-header">
                <span class="note-grip"></span>
                <button type="button" class="note-delete" aria-label="Delete note">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <textarea placeholder="Write here"></textarea>
        `;

        const textarea = note.querySelector('textarea');
        if (textarea) {
            textarea.value = data?.text || '';
            textarea.addEventListener('input', saveNotes);
        }

        const deleteButton = note.querySelector('.note-delete');
        if (deleteButton) {
            deleteButton.addEventListener('pointerdown', event => {
                event.stopPropagation();
            });
            deleteButton.addEventListener('click', () => {
                note.remove();
                saveNotes();
            });
        }

        enableDrag(note);
        notesBoard.appendChild(note);
        note.style.zIndex = ++noteZIndex;
    };

    const loadNotes = () => {
        if (!notesBoard) {
            return;
        }
        const raw = localStorage.getItem(noteStorageKey);
        if (!raw) {
            createNote({});
            return;
        }
        try {
            const stored = JSON.parse(raw);
            if (Array.isArray(stored) && stored.length) {
                stored.forEach(note => createNote(note));
                return;
            }
        } catch (error) {
        }
        createNote({});
    };

    if (addNoteButton) {
        addNoteButton.addEventListener('click', () => {
            createNote({});
            saveNotes();
        });
    }

    if (clearNotesButton && notesBoard) {
        clearNotesButton.addEventListener('click', () => {
            notesBoard.innerHTML = '';
            localStorage.removeItem(noteStorageKey);
        });
    }

    loadNotes();

    let timer = null;
    let timeLeft = 0;
    const timerButtons = document.querySelectorAll('.timer-button');
    const timerControls = document.getElementById('timer-controls');
    const runningTimer = document.getElementById('running-timer');
    const timeRemainingDisplay = document.getElementById('time-remaining');
    const timerStatus = document.getElementById('timer-status');
    const customTimerInput = document.getElementById('custom-timer-input');
    const customTimerStart = document.getElementById('custom-timer-start');

    const updateTimerDisplay = () => {
        if (!timeRemainingDisplay) {
            return;
        }
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeRemainingDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const showTimerControls = () => {
        if (timerControls) {
            timerControls.hidden = false;
        }
        if (runningTimer) {
            runningTimer.hidden = true;
        }
    };

    const showRunningTimer = () => {
        if (timerControls) {
            timerControls.hidden = true;
        }
        if (runningTimer) {
            runningTimer.hidden = false;
        }
    };

    const startTimer = duration => {
        clearInterval(timer);
        timeLeft = duration;
        updateTimerDisplay();
        showRunningTimer();
        if (timerStatus) {
            timerStatus.textContent = '';
        }

        timer = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                clearInterval(timer);
                timeLeft = 0;
                updateTimerDisplay();
                if (timerStatus) {
                    timerStatus.textContent = 'Time is up.';
                }
                return;
            }
            updateTimerDisplay();
        }, 1000);
    };

    timerButtons.forEach(button => {
        button.addEventListener('click', () => {
            const duration = parseInt(button.dataset.time, 10);
            if (!Number.isNaN(duration)) {
                startTimer(duration);
            }
        });
    });

    if (customTimerStart && customTimerInput) {
        customTimerStart.addEventListener('click', () => {
            const minutes = parseInt(customTimerInput.value, 10);
            if (!Number.isNaN(minutes) && minutes > 0) {
                startTimer(minutes * 60);
                customTimerInput.value = '';
            }
        });
    }

    const stopButton = document.getElementById('stop-button');
    const addTimeButton = document.getElementById('add-time-button');
    const subtractTimeButton = document.getElementById('subtract-time-button');

    if (stopButton) {
        stopButton.addEventListener('click', () => {
            clearInterval(timer);
            timeLeft = 0;
            updateTimerDisplay();
            if (timerStatus) {
                timerStatus.textContent = '';
            }
            showTimerControls();
        });
    }

    if (addTimeButton) {
        addTimeButton.addEventListener('click', () => {
            if (timeLeft > 0) {
                timeLeft += 300;
                updateTimerDisplay();
            }
        });
    }

    if (subtractTimeButton) {
        subtractTimeButton.addEventListener('click', () => {
            if (timeLeft > 300) {
                timeLeft -= 300;
                updateTimerDisplay();
            }
        });
    }
});
