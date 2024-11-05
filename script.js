// script.js

let audioContext, audioElement, analyser, dataArray, bufferLength, source;
let autoplay = false;
let randomPlay = false;
let playlist = [];
let currentTrackIndex = 0;
let gainNode;
let bassEQ, midEQ, trebleEQ;
let progressBar;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize the AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create the audio element and configure the source
    audioElement = new Audio();
    audioElement.crossOrigin = "anonymous";

    // Setup the AudioContext and the analyser
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    gainNode = audioContext.createGain();
    bassEQ = audioContext.createBiquadFilter();
    midEQ = audioContext.createBiquadFilter();
    trebleEQ = audioContext.createBiquadFilter();

    bassEQ.type = "lowshelf";
    midEQ.type = "peaking";
    trebleEQ.type = "highshelf";

    bassEQ.frequency.value = 500;
    midEQ.frequency.value = 1500;
    trebleEQ.frequency.value = 3000;

    // Connect the audio source and the filters to the AudioContext
    source = audioContext.createMediaElementSource(audioElement);
    source.connect(bassEQ);
    bassEQ.connect(midEQ);
    midEQ.connect(trebleEQ);
    trebleEQ.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    progressBar = document.getElementById('progressBar'); // Reference to the progress bar

    drawVisualizer();
    updateProgressBar();

    // Event listener for the end of track playback
    audioElement.addEventListener('ended', handleTrackEnd);

    // Update the total track time when metadata is loaded
    audioElement.addEventListener('loadedmetadata', () => {
        document.getElementById('totalTime').textContent = formatTime(audioElement.duration);
    });
});

function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        
        // Voeg zowel MP3 als MP4 toe aan de playlist met het bestandstype
        playlist.push({ url: url, name: file.name, type: file.type });
    }
    updatePlaylist();
}

function updatePlaylist() {
    const playlistDiv = document.getElementById('playlist');
    playlistDiv.innerHTML = '';
    playlist.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-item';
        trackDiv.innerHTML = `<span>${track.name}</span><button onclick="removeTrack(${index})">Remove</button>`;
        trackDiv.onclick = () => playTrack(index);
        playlistDiv.appendChild(trackDiv);
    });
}

function playTrack(index) {
    const track = playlist[index];
    currentTrackIndex = index;

    if (track.type === "video/mp4") {
        // Als het bestand een video is, open het in de popup
        showPopup(track.url);
    } else {
        // Sluit de popup en verlaat fullscreen als er een MP3-bestand wordt afgespeeld na een MP4
        closePopup();
        exitFullscreen();

        // Voor audiobestanden (zoals MP3)
        audioElement.src = track.url;
        audioElement.play();
        document.querySelector('button[onclick="togglePlayPause()"]').textContent = "Pause";
        document.getElementById('currentTrack').textContent = `Now playing: ${track.name}`;
    }
}

function showPopup(videoUrl) {
    const videoPopup = document.getElementById("videoPopup");
    const videoPlayer = document.getElementById("videoPlayer");
    videoPlayer.src = videoUrl;
    videoPopup.style.display = "flex";
    videoPlayer.play(); // Start de video automatisch in de popup

    // Event listener voor het einde van de video
    videoPlayer.onended = handleTrackEnd;
    
    // Zet de video in fullscreen-modus
    if (videoPopup.requestFullscreen) {
        videoPopup.requestFullscreen();
    } else if (videoPopup.webkitRequestFullscreen) { // Safari
        videoPopup.webkitRequestFullscreen();
    } else if (videoPopup.msRequestFullscreen) { // IE11
        videoPopup.msRequestFullscreen();
    }
}

function closePopup() {
    const videoPopup = document.getElementById("videoPopup");
    const videoPlayer = document.getElementById("videoPlayer");
    videoPlayer.pause();
    videoPlayer.src = "";
    videoPopup.style.display = "none";
    
    // Verlaat fullscreen-modus indien actief
    exitFullscreen();
}

function exitFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
    }
}

function togglePlayPause() {
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            playOrPauseAudio();
        });
    } else {
        playOrPauseAudio();
    }
}

function playOrPauseAudio() {
    if (playlist.length === 0) return;  // Do not play anything if the playlist is empty

    if (audioElement.paused) {
        if (!audioElement.src) {
            playTrack(0);
        } else {
            audioElement.play();
            document.querySelector('button[onclick="togglePlayPause()"]').textContent = "Pause";
        }
    } else {
        audioElement.pause();
        document.querySelector('button[onclick="togglePlayPause()"]').textContent = "Play";
    }
}

function prevTrack() {
    if (playlist.length > 0) {
        audioElement.pause();  // Stop de huidige track
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        playTrack(currentTrackIndex);
    }
}

function nextTrack() {
    if (playlist.length > 0) {
        audioElement.pause();  // Stop de huidige track
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        playTrack(currentTrackIndex);
    }
}

function toggleAutoplay() {
    autoplay = !autoplay;
    document.querySelector('button[onclick="toggleAutoplay()"]').textContent = `Autoplay: ${autoplay ? 'On' : 'Off'}`;
}

function toggleRandom() {
    randomPlay = !randomPlay;
    document.querySelector('button[onclick="toggleRandom()"]').textContent = `Shuffle: ${randomPlay ? 'On' : 'Off'}`;
}

function clearPlaylist() {
    playlist = [];
    audioElement.pause();
    audioElement.src = '';
    updatePlaylist();
    document.getElementById('currentTrack').textContent = "No track playing";
    document.getElementById('currentTime').textContent = "0:00";
    document.getElementById('totalTime').textContent = "0:00";
}

function removeTrack(index) {
    playlist.splice(index, 1);
    updatePlaylist();
    if (playlist.length === 0) {
        document.getElementById('currentTrack').textContent = "No track playing";
        document.getElementById('currentTime').textContent = "0:00";
        document.getElementById('totalTime').textContent = "0:00";
    }
}

function setVolume(volume) {
    gainNode.gain.value = volume;
}

function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            canvasCtx.fillStyle = 'rgb(173, 216, 230)';
            canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
            x += barWidth + 1;
        }
    }

    draw();
}

function changeEqualizer(element) {
    const value = parseFloat(element.value);
    switch (element.id) {
        case 'bass':
            bassEQ.gain.value = value;
            break;
        case 'mid':
            midEQ.gain.value = value;
            break;
        case 'treble':
            trebleEQ.gain.value = value;
            break;
    }
}

function updateProgressBar() {
    audioElement.addEventListener('timeupdate', () => {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.value = progress;
        document.getElementById('currentTime').textContent = formatTime(audioElement.currentTime);
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsPart = Math.floor(seconds % 60);
    return `${minutes}:${secondsPart < 10 ? '0' : ''}${secondsPart}`;
}

function seekTrack(value) {
    if (audioElement.duration) {
        const seekTime = (value / 100) * audioElement.duration;
        audioElement.currentTime = seekTime;
    }
}

function handleTrackEnd() {
    if (autoplay) {
        if (randomPlay) {
            currentTrackIndex = Math.floor(Math.random() * playlist.length);
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        }
        
        const nextTrack = playlist[currentTrackIndex];
        
        if (nextTrack.type === "video/mp4") {
            showPopup(nextTrack.url);
        } else {
            closePopup();
            exitFullscreen(); // Verlaat fullscreen-modus als de volgende track een MP3 is
            playTrack(currentTrackIndex);
        }
    } else {
        document.querySelector('button[onclick="togglePlayPause()"]').textContent = "Play";
    }
}
