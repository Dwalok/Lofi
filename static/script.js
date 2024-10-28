document.addEventListener("DOMContentLoaded", function () {
    const iframe = document.getElementById('soundcloud-player');
    const player = SC.Widget(iframe);
    const volumeControl = document.getElementById('volume-control');

    // Événement pour le bouton Next
    document.getElementById('next-button').addEventListener('click', function () {
        player.next();
    });
    // Événement pour le bouton Next
    document.getElementById('prev-button').addEventListener('click', function () {
        player.prev();
    });

    document.getElementById('play-pause-button').addEventListener('click', function () {
        // Vérifier si le lecteur est en pause ou en lecture
        player.isPaused(function(paused) {
            if (paused) {
                // Si en pause, démarrer la lecture
                player.play();
                // Changer l'icône en pause
                playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                // Si en lecture, mettre en pause
                player.pause();
                // Changer l'icône en play
                playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    });
    volumeControl.addEventListener('input', function (event) {
        const volume = event.target.value / 100; // Convertit 0-100 en 0-1
        player.setVolume(volume); // Réglage du volume
    });

    // Initialisation du volume
    player.setVolume(volumeControl.value / 100); // Réglage du volume initial


});


function startTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    m = checkTime(m);
    document.getElementById('time').innerHTML =
        h + ":" + m;
    var t = setTimeout(startTime, 500);
}
function checkTime(i) {
    if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
    return i;
}

startTime();

let estVisible = false; // Variable pour suivre l'état de la div

document.getElementById('music-button').onclick = function() {
    estVisible = !estVisible; // Inverser l'état de visibilité
    document.getElementById('music-container').style.display = estVisible ? 'flex' : 'none';
};


// Sélectionne les éléments nécessaires
const controlImageButton = document.getElementById('control-image');
const videoWallpapers = document.getElementById('video-wallpapers');
const wallpaperThumbnails = document.querySelectorAll('.wallpaper-thumbnail');  // Les images utilisées pour changer de fond
const videoBackground = document.querySelector('.video-background');  // Sélectionne la vidéo de fond d'écran
const sourceElement = videoBackground.querySelector('source');  // Sélectionne l'élément source de la vidéo

// Gestionnaire d'événement pour afficher/cacher la div des vidéos
controlImageButton.addEventListener('click', function() {
    if (videoWallpapers.style.display === 'none' || videoWallpapers.style.display === '') {
        videoWallpapers.style.display = 'block'; // Afficher la div
    } else {
        videoWallpapers.style.display = 'none'; // Cacher la div
    }
});

// Fonction pour changer le fond d'écran vidéo
function changeBackgroundVideo(videoSrc) {
    // Mettre à jour l'attribut 'src' de l'élément source
    sourceElement.setAttribute('src', videoSrc);

    // Recharger la vidéo pour appliquer la nouvelle source
    videoBackground.load();
}

// Gestionnaire d'événement pour changer le fond d'écran lorsque l'on clique sur une miniature
wallpaperThumbnails.forEach(function(thumbnail) {
    thumbnail.addEventListener('click', function() {
        const videoSrc = thumbnail.getAttribute('data-video-src');  // Obtenir la source de la vidéo depuis 'data-video-src'
        changeBackgroundVideo(videoSrc);  // Mettre à jour le fond d'écran

        // Cacher la div des vidéos après avoir sélectionné une vidéo
        videoWallpapers.style.display = 'none';
    });
});


const iframe = document.getElementById('soundcloud-player');
const volumeControl = document.getElementById('volume-control');

// Attendez que l'iframe soit complètement chargée
iframe.onload = function() {
    // Fonction pour gérer le volume
    const setVolume = (volume) => {
        const volumeValue = volume; // Convertit le volume de 0-100 à 0-1
        iframe.contentWindow.postMessage(JSON.stringify({
            method: 'setVolume',
            value: volumeValue
        }), '*');
    };

    // Événement sur le slider
    volumeControl.addEventListener('input', (event) => {
        setVolume(event.target.value);
    });

    // Initialisation du volume
    setVolume(volumeControl.value);
};

let timer;
let timeLeft = 0; // Initialiser à 0 pour indiquer qu'aucun minuteur n'est actif
const timerButton = document.getElementById('timer-button');
const timerControls = document.getElementById('timer-controls');
const runningTimer = document.getElementById('running-timer');
const timeRemainingDisplay = document.getElementById('time-remaining');

// Afficher ou cacher les contrôles du minuteur
timerButton.addEventListener('click', function () {
    if (timeLeft > 0) {
        // Si un minuteur est actif, afficher le minuteur en cours
        runningTimer.style.display = (runningTimer.style.display === 'none') ? 'block' : 'none';
    } else {
        // Si aucun minuteur n'est actif, afficher ou cacher les contrôles
        timerControls.style.display = (timerControls.style.display === 'none' || timerControls.style.display === '') ? 'block' : 'none';
    }
});

// Gérer le démarrage du minuteur
document.querySelectorAll('.timer-button').forEach(button => {
    button.addEventListener('click', function () {
        const time = parseInt(this.dataset.time);
        startTimer(time);
    });
});

// Fonction pour démarrer le minuteur
function startTimer(duration) {
    clearInterval(timer);
    timeLeft = duration;
    updateDisplay();

    timerControls.style.display = 'none'; // Cacher les options de minuteur
    runningTimer.style.display = 'block'; // Afficher le minuteur en cours

    timer = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(timer);
            alert("Le temps est écoulé !");
            runningTimer.style.display = 'none'; // Cacher le minuteur en cours
            timerControls.style.display = 'block'; // Afficher les options de minuteur
        }

        updateDisplay();
    }, 1000);
}

// Mettre à jour l'affichage du minuteur
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeRemainingDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Arrêter le minuteur
document.getElementById('stop-button').addEventListener('click', function () {
    clearInterval(timer);
    runningTimer.style.display = 'none'; // Cacher le minuteur en cours
    timerControls.style.display = 'block'; // Réafficher les options de minuteur
    timeLeft = 0; // Réinitialiser le temps restant
});

// Ajouter 5 minutes
document.getElementById('add-time-button').addEventListener('click', function () {
    if (timeLeft > 0) { // Ne pas ajouter du temps si le minuteur n'est pas actif
        timeLeft += 300; // Ajouter 5 minutes (300 secondes)
        updateDisplay();
    }
});

// Soustraire 5 minutes
document.getElementById('subtract-time-button').addEventListener('click', function () {
    if (timeLeft > 300) { // Ne pas permettre de descendre en dessous de 0
        timeLeft -= 300; // Soustraire 5 minutes (300 secondes)
        updateDisplay();
    }
});


let estVisibleson = false; // Variable pour suivre l'état de la div

document.getElementById('volume-button').onclick = function() {
    estVisibleson = !estVisibleson; // Inverser l'état de visibilité
    document.getElementById('volume-control').style.display = estVisibleson ? 'flex' : 'none'; // Utiliser la bonne variable
};

