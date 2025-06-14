class gayaVP {
    constructor(container, options = {}) {
        this.container = container;
        this.video = container.querySelector('video');
        this.controlsContainer = container.querySelector('.gaya-v-c');

        this.sources = options.sources || [];
        this.defaultSource = this.sources[0]?.src || '';
        this.savedVolume = 0.5;
        this.isMuted = false;

        this.renderControls();
        this.setVideoSource(this.defaultSource);
        this.injectStyles(); // <- Add this line
        this.addEventListeners();
    }

    injectStyles() {
        if (document.getElementById('gaya-v-p-s')) return;

        const style = document.createElement('style');
        style.id = 'gaya-v-p-s';
        style.textContent = `
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #121212;
            color: white;
            font-family: Arial, sans-serif;
        }

        .video-container {
            position: relative;
            width: 80%;
            max-width: 800px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }

        video {
            width: 100%;
            display: block;
        }

        .controls {
            position: absolute;
            bottom: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .control-button {
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            margin: 0 5px;
        }

        .progress-container {
            flex-grow: 1;
            display: flex;
            align-items: center;
            margin: 0 10px;
        }

        .seek-bar {
            flex-grow: 1;
        }

        .volume-slider {
            width: 80px;
        }

        @media (max-width: 600px) {
            .volume-slider {
                display: none;
            }
        }

        .resolution-selector {
            margin: 0 5px;
            background: black;
            color: white;
            border: none;
            font-size: 14px;
        }

        .kdev-video-controls {
            display: flex;
        }
    `;
        document.head.appendChild(style);
    }


    renderControls() {
        this.controlsContainer.innerHTML = `
            <button class="control-button play">▶</button>
            <div class="progress-container">
                <input type="range" class="seek-bar" value="0" min="0" max="100">
                <span class="time-display">0:00 / 0:00</span>
            </div>
            <button class="control-button volume">🔊</button>
            <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="0.5">
            <select class="resolution-selector">
                ${this.sources.map(src => `<option value="${src.src}">${src.res}</option>`).join('')}
            </select>
            <button class="control-button fullscreen">⛶</button>
        `;

        this.playPauseButton = this.controlsContainer.querySelector('.play');
        this.muteButton = this.controlsContainer.querySelector('.volume');
        this.volumeSlider = this.controlsContainer.querySelector('.volume-slider');
        this.seekBar = this.controlsContainer.querySelector('.seek-bar');
        this.timeDisplay = this.controlsContainer.querySelector('.time-display');
        this.resolutionSelector = this.controlsContainer.querySelector('.resolution-selector');
        this.fullscreenButton = this.controlsContainer.querySelector('.fullscreen');
    }

    setVideoSource(src) {
        this.video.src = src;
        this.video.load();
        this.video.volume = this.savedVolume;
    }

    updateTimeDisplay() {
        const current = this.video.currentTime;
        const duration = this.video.duration || 0;
        const format = t => `${Math.floor(t / 60)}:${(Math.floor(t % 60)).toString().padStart(2, '0')}`;
        this.timeDisplay.textContent = `${format(current)} / ${format(duration)}`;
    }

    addEventListeners() {
        this.playPauseButton.addEventListener('click', () => {
            if (this.video.paused) this.video.play();
            else this.video.pause();
        });

        this.video.addEventListener('play', () => this.playPauseButton.textContent = '⏸');
        this.video.addEventListener('pause', () => this.playPauseButton.textContent = '▶');
        this.video.addEventListener('click', () => this.video.paused ? this.video.play() : this.video.pause());

        this.muteButton.addEventListener('click', () => {
            this.isMuted = !this.isMuted;
            this.video.muted = this.isMuted;
            this.volumeSlider.value = this.isMuted ? 0 : this.savedVolume;
            this.muteButton.textContent = this.isMuted ? '🔇' : '🔊';
        });

        this.volumeSlider.addEventListener('input', () => {
            this.savedVolume = parseFloat(this.volumeSlider.value);
            this.isMuted = this.savedVolume <= 0;
            this.video.volume = this.savedVolume;
            this.video.muted = this.isMuted;
            this.muteButton.textContent = this.isMuted ? '🔇' : '🔊';
        });

        this.video.addEventListener('timeupdate', () => {
            const value = (this.video.currentTime / this.video.duration) * 100;
            this.seekBar.value = value || 0;
            this.updateTimeDisplay();
        });

        this.seekBar.addEventListener('input', () => {
            this.video.currentTime = (this.seekBar.value / 100) * this.video.duration;
        });

        this.resolutionSelector.addEventListener('change', () => {
            const src = this.resolutionSelector.value;
            const time = this.video.currentTime;
            const wasPlaying = !this.video.paused;

            this.setVideoSource(src);
            this.video.addEventListener('loadedmetadata', () => {
                this.video.currentTime = time;
                if (wasPlaying) this.video.play();
            }, { once: true });
        });

        this.fullscreenButton.addEventListener('click', () => {
            if (this.container.requestFullscreen) this.container.requestFullscreen();
            else if (this.container.webkitRequestFullscreen) this.container.webkitRequestFullscreen();
            else if (this.container.msRequestFullscreen) this.container.msRequestFullscreen();
        });

        document.addEventListener('dblclick', e => {
            if (!this.container.contains(e.target)) return;
            if (document.fullscreenElement) {
                document.exitFullscreen?.();
            } else {
                this.container.requestFullscreen?.();
            }
        });
    }
}
