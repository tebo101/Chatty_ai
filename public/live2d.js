/**
 * Live2D Miku Night Controller
 * Handles model loading, idle animations, and mood-based expressions
 * Uses pixi-live2d-display with PixiJS + Cubism 4 SDK
 */
(function () {
    'use strict';

    // Get active character from localStorage
    let MODEL_URL = '/Miku_night/v2_21miku_night_t01.model3.json';
    let isLive2DEnabled = true;

    try {
        const charJson = localStorage.getItem('activeCharacter');
        if (charJson) {
            const char = JSON.parse(charJson);
            if (char.modelPath) {
                MODEL_URL = char.modelPath;
            } else {
                isLive2DEnabled = false; // Disable Live2D if no model provided
            }
        }
    } catch (e) {
        console.error('Failed to parse active character', e);
    }

    let model = null;
    let pixiApp = null;
    let currentMood = 'neutral';
    let idleTimer = null;
    let moodResetTimer = null;

    // Motion groups mapped by mood for the Miku Night model
    const moodMotions = {
        happy: [
            'w-cute01-glad', 'w-cute02-glad', 'w-cute11-glad',
            'w-happy02-nod', 'w-happy11-guts', 'w-cute01-wink04',
            'w-cute02-wink', 'w-adult11-glad02', 'w-adult12-glad'
        ],
        sad: [
            'w-cool16-sad', 'w-happy16-sad', 'w-normal07-sad',
            'w-normal08-sad', 'w-cool13-sigh', 'w-happy09-sigh',
            'w-normal07-sigh'
        ],
        angry: [
            'w-cool10-angry', 'w-happy09-angry', 'w-happy14-angry',
            'w-normal16-angry', 'w-cute13-angry'
        ],
        surprised: [
            'w-cute02-forward', 'w-cute11-forward', 'w-cool10-forward',
            'w-cool13-forward', 'w-happy09-forward', 'w-happy14-forward',
            'w-normal03-forward', 'w-normal04-forward'
        ],
        neutral: [
            'w-normal01-tilthead', 'w-normal03-tilthead', 'w-normal04-tilthead',
            'w-normal15-tilthead', 'w-normal01-nod', 'w-normal03-nod',
            'w-normal04-nod', 'w-normal15-nod', 'w-cute01-tilthead',
            'w-cute02-tilthead'
        ]
    };

    // ---- Initialize PixiJS application ----
    function initPixiApp() {
        const canvas = document.getElementById('live2d-canvas');
        if (!canvas) {
            console.error('[Live2D] Canvas element not found');
            return null;
        }

        try {
            const app = new PIXI.Application({
                view: canvas,
                transparent: true,
                autoStart: true,
                resizeTo: canvas.parentElement,
                backgroundAlpha: 0
            });
            return app;
        } catch (e) {
            console.error('[Live2D] Failed to create PIXI Application:', e);
            return null;
        }
    }

    // ---- Find the Live2DModel class ----
    function getLive2DModelClass() {
        if (window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) {
            return window.PIXI.live2d.Live2DModel;
        }
        if (window.Live2DModel) {
            return window.Live2DModel;
        }
        console.error('[Live2D] Could not find Live2DModel class.',
            'PIXI:', !!window.PIXI,
            'PIXI.live2d:', !!(window.PIXI && window.PIXI.live2d),
            'Available PIXI keys:', window.PIXI ? Object.keys(window.PIXI).filter(k => k.toLowerCase().includes('live')).join(', ') : 'N/A'
        );
        return null;
    }

    // ---- Load the Live2D model ----
    async function loadModel() {
        if (!isLive2DEnabled) {
            const container = document.getElementById('live2d-container');
            if (container) {
                container.style.display = 'none';
            }
            console.log('[Live2D] Live2D is disabled for this character.');
            return;
        }

        try {
            pixiApp = initPixiApp();
            if (!pixiApp) return;

            const Live2DModel = getLive2DModelClass();
            if (!Live2DModel) {
                console.error('[Live2D] Live2DModel class not available. Scripts may not have loaded correctly.');
                return;
            }

            console.log('[Live2D] Loading model from:', MODEL_URL);

            model = await Live2DModel.from(MODEL_URL, {
                autoInteract: false
            });

            console.log('[Live2D] Model loaded:', model);

            // Scale and position the model
            const container = document.getElementById('live2d-container');
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            const scale = Math.min(containerWidth / model.width, containerHeight / model.height) * 0.85;
            model.scale.set(scale);
            model.anchor.set(0.5, 0.5);
            model.x = pixiApp.renderer.width / 2;
            model.y = pixiApp.renderer.height / 2;

            pixiApp.stage.addChild(model);

            // Enable mouse tracking — model eyes follow the cursor
            document.addEventListener('mousemove', (e) => {
                if (!model) return;
                const rect = pixiApp.view.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                model.focus(x * pixiApp.renderer.width, y * pixiApp.renderer.height);
            });

            // Start idle animation loop
            startIdleLoop();

            // Show the container now that the model is loaded
            container.classList.add('loaded');

            console.log('[Live2D] ✅ Miku Night model loaded and displayed');
        } catch (err) {
            console.error('[Live2D] Failed to load model:', err);
        }
    }

    // ---- Play a random motion from a group name ----
    function playRandomMotion(motionNames) {
        if (!model || !motionNames || motionNames.length === 0) return;

        const name = motionNames[Math.floor(Math.random() * motionNames.length)];

        try {
            const motionManager = model.internalModel.motionManager;
            // In Cubism 4 pixi-live2d-display, startMotion takes (group, index, priority)
            motionManager.startMotion(name, 0, 2 /* NORMAL priority */);
        } catch (e) {
            console.warn('[Live2D] Could not play motion:', name, e);
        }
    }

    // ---- Idle Animation Loop ----
    function startIdleLoop() {
        if (!model) return;

        function playIdle() {
            if (!model || currentMood !== 'neutral') return;
            playRandomMotion(moodMotions.neutral);
        }

        playIdle();
        idleTimer = setInterval(playIdle, 8000);
    }

    // ---- Set Mood (Expression) ----
    function setMood(mood) {
        if (!model) return;

        currentMood = mood;

        if (moodResetTimer) {
            clearTimeout(moodResetTimer);
            moodResetTimer = null;
        }

        // Play a mood-appropriate motion
        const motions = moodMotions[mood] || moodMotions.neutral;
        playRandomMotion(motions);

        updateMoodIndicator(mood);

        const container = document.getElementById('live2d-container');
        container.className = 'live2d-container loaded mood-' + mood;

        if (mood !== 'neutral') {
            moodResetTimer = setTimeout(() => {
                setMood('neutral');
            }, 8000);
        }
    }

    // ---- Mood Indicator Badge ----
    function updateMoodIndicator(mood) {
        const indicator = document.getElementById('mood-indicator');
        if (!indicator) return;

        const moodEmojis = {
            neutral: '😊',
            happy: '😄',
            sad: '😢',
            angry: '😠',
            surprised: '😲'
        };

        const moodLabels = {
            neutral: 'Relaxed',
            happy: 'Happy',
            sad: 'Sad',
            angry: 'Angry',
            surprised: 'Surprised'
        };

        indicator.innerHTML = `${moodEmojis[mood] || '😊'} ${moodLabels[mood] || 'Neutral'}`;
        indicator.className = 'mood-indicator mood-' + mood;
    }

    // ---- Expose API globally ----
    window.live2dSetMood = setMood;
    window.live2dModel = () => model;

    // ---- Initialize on page load ----
    function init() {
        console.log('[Live2D] Initializing...');
        console.log('[Live2D] PIXI available:', !!window.PIXI);
        console.log('[Live2D] Cubism 4 Core available:', !!window.Live2DCubismCore);
        console.log('[Live2D] PIXI.live2d available:', !!(window.PIXI && window.PIXI.live2d));

        // Give a small delay to ensure all scripts have fully executed
        setTimeout(loadModel, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
