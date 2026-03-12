document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('mic-btn');
    const systemStatus = document.getElementById('system-status');
    const recordingPulse = document.getElementById('recording-pulse');
    const chatHistory = document.getElementById('chat-history');
    const textInput = document.getElementById('text-input');
    const sendBtn = document.getElementById('send-btn');

    // --- Personality Modal ---
    const personalityBtn = document.getElementById('personality-btn');
    const personalityModal = document.getElementById('personality-modal');
    const personalityText = document.getElementById('personality-text');
    const editWelcome = document.getElementById('edit-welcome');
    const editAvatar = document.getElementById('edit-avatar');
    const editVoice = document.getElementById('edit-voice');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const toast = document.getElementById('toast');

    // --- New UI Elements ---
    const resetBtn = document.getElementById('reset-btn');
    const chatTitle = document.getElementById('chat-title');
    let activeCharacterName = 'AI';
    let activeCharacterId = 'default-miku';
    let activeCharacterAvatar = null;
    let initialWelcomeMessage = 'Hello! Nice to meet you.';
    let activeCharacterVoiceId = 2; // Default to Shikoku Metan (Normal)
    let userProfile = { name: 'User', pfp: null };

    // Fetch User Profile
    async function fetchUserProfile() {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                userProfile = await res.json();
            }
        } catch (e) {
            console.warn('Could not fetch user profile', e);
        }
    }
    fetchUserProfile();

    // Fetch Voicevox Speakers
    async function fetchVoicevoxSpeakers() {
        try {
            const res = await fetch('/api/tts/speakers');
            if (res.ok) {
                const speakers = await res.json();
                if (editVoice) {
                    editVoice.innerHTML = '';
                    speakers.forEach(speaker => {
                        const option = document.createElement('option');
                        option.value = speaker.id;
                        option.textContent = speaker.name;
                        editVoice.appendChild(option);
                    });

                    // Re-apply if already loaded
                    editVoice.value = activeCharacterVoiceId;
                }
            } else {
                if (editVoice) editVoice.innerHTML = '<option value="2">Engine Offline</option>';
            }
        } catch (e) {
            console.warn('Could not fetch Voicevox speakers', e);
            if (editVoice) editVoice.innerHTML = '<option value="2">Engine Offline</option>';
        }
    }
    fetchVoicevoxSpeakers();

    function applyAvatarBackground(avatarUrl) {
        if (!avatarUrl || !avatarUrl.startsWith('/avatars/')) {
            document.body.style.backgroundImage = '';
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let r = 0, g = 0, b = 0;
                let count = 0;

                for (let i = 0; i < data.length; i += 16) {
                    if (data[i + 3] < 128) continue;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }

                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    document.body.style.backgroundImage = `
                        radial-gradient(at 0% 0%, rgba(${r}, ${g}, ${b}, 0.7) 0px, transparent 60%),
                        radial-gradient(at 100% 100%, rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.4) 0px, transparent 60%)
                    `;
                }
            } catch (e) {
                console.error('Error extracting color from avatar', e);
            }
        };
        img.src = avatarUrl;
    }

    function openModal() {
        personalityModal.classList.remove('hidden');
        requestAnimationFrame(() => personalityModal.classList.add('visible'));
        personalityText.focus();
    }

    function closeModal() {
        personalityModal.classList.remove('visible');
        setTimeout(() => personalityModal.classList.add('hidden'), 250);
    }

    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.className = 'toast' + (isError ? ' toast-error' : '');
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 2500);
    }

    // Fetch current personality on load
    async function loadPersonality() {
        try {
            // Check if we came from dashboard with an active character
            const activeCharJson = localStorage.getItem('activeCharacter');
            if (activeCharJson) {
                const char = JSON.parse(activeCharJson);
                activeCharacterName = char.name;
                activeCharacterId = char.id || 'default-miku';
                activeCharacterAvatar = char.avatar || char.name.charAt(0).toUpperCase();
                initialWelcomeMessage = char.welcomeMessage || `Hello! My name is ${char.name}. Nice to meet you.`;

                if (chatTitle) chatTitle.textContent = `${char.name} Chat`;

                // Set the personality input explicitly to what the char expects
                personalityText.value = char.personality || '';
                editWelcome.value = char.welcomeMessage || '';
                editAvatar.value = '';

                activeCharacterVoiceId = char.voiceId !== undefined ? char.voiceId : 2;
                if (editVoice) editVoice.value = activeCharacterVoiceId;

                applyAvatarBackground(activeCharacterAvatar);

                // Sync the selected character's personality to the backend immediately
                // so the server's global systemPrompt matches the frontend.
                try {
                    await fetch('/api/personality', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ personality: char.personality })
                    });
                } catch (e) {
                    console.error('Failed to sync personality to backend on load', e);
                }
            } else {
                const res = await fetch('/api/personality');
                const data = await res.json();
                personalityText.value = data.personality;
            }

            // Restore chat history from backend (specific to the active character container)
            const histRes = await fetch(`/api/chat/history?characterId=${activeCharacterId}`);
            const histData = await histRes.json();

            chatHistory.innerHTML = '';

            if (histData.history && histData.history.length > 0) {
                // Restore history
                histData.history.forEach(msg => {
                    const sender = msg.role === 'assistant' ? 'ai' : 'user';
                    appendMessage(sender, msg.content);
                });
            } else {
                // New chat, show welcome message
                let welcome = initialWelcomeMessage;
                if (userProfile && userProfile.name && userProfile.name !== 'User') {
                    welcome = `${userProfile.name}, ${initialWelcomeMessage}`;
                }
                setTimeout(() => appendMessage('ai', welcome), 500);
            }
        } catch (err) {
            console.error('Failed to load personality:', err);
        }
    }

    async function savePersonality() {
        const text = personalityText.value.trim();
        const welcomeMessage = editWelcome.value.trim();
        const avatarImage = editAvatar.files[0];

        if (!text) {
            showToast('Personality cannot be empty.', true);
            return;
        }

        modalSaveBtn.disabled = true;
        modalSaveBtn.textContent = 'Saving...';

        const formData = new FormData();
        formData.append('personality', text);
        if (welcomeMessage) formData.append('welcomeMessage', welcomeMessage);
        if (avatarImage) formData.append('avatarImage', avatarImage);
        if (editVoice && editVoice.value) {
            formData.append('voiceId', editVoice.value);
            activeCharacterVoiceId = parseInt(editVoice.value, 10);
        }

        try {
            const res = await fetch(`/api/characters/${activeCharacterId}`, {
                method: 'PUT',
                body: formData
            });
            if (!res.ok) throw new Error('Save failed');

            const result = await res.json();
            const updatedChar = result.character;

            // Update local storage and memory
            localStorage.setItem('activeCharacter', JSON.stringify(updatedChar));
            activeCharacterAvatar = updatedChar.avatar || updatedChar.name.charAt(0);
            initialWelcomeMessage = updatedChar.welcomeMessage || `Hello! My name is ${updatedChar.name}.`;

            applyAvatarBackground(activeCharacterAvatar);

            // Clear history and restart to apply new personality visually
            await fetch('/api/chat/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: activeCharacterId })
            });
            chatHistory.innerHTML = '';
            setTimeout(() => appendMessage('ai', initialWelcomeMessage), 500);

            closeModal();
            showToast('✨ Settings updated! Chat history reset.');
        } catch (err) {
            console.error('Failed to save settings:', err);
            showToast('Failed to save. Is the server running?', true);
        } finally {
            modalSaveBtn.disabled = false;
            modalSaveBtn.textContent = 'Save Personality';
        }
    }

    personalityBtn.addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modalSaveBtn.addEventListener('click', savePersonality);

    // Close modal on backdrop click
    personalityModal.addEventListener('click', (e) => {
        if (e.target === personalityModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !personalityModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // --- Reset Chat ---
    resetBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear the conversation history?')) return;

        try {
            const res = await fetch('/api/chat/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: activeCharacterId })
            });
            if (!res.ok) throw new Error('Reset failed');

            // Clear UI
            chatHistory.innerHTML = '';
            showToast('Chat history cleared.');

            // Add a welcome message back from the active character
            setTimeout(() => {
                appendMessage('ai', initialWelcomeMessage);
            }, 500);

        } catch (err) {
            console.error('Failed to reset chat:', err);
            showToast('Failed to reset chat.', true);
        }
    });

    loadPersonality();

    // Speech Recognition Setup (STT)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (!SpeechRecognition) {
        systemStatus.textContent = 'Speech Recognition Not Supported';
        micBtn.disabled = true;
        micBtn.style.opacity = '0.5';
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('recording');
            systemStatus.textContent = 'Listening...';
            recordingPulse.classList.remove('hidden');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            resetMicState();
            systemStatus.textContent = 'Processing...';

            // Show the recognized user text in chat
            appendMessage('user', transcript);

            // Send text to backend
            await processText(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            resetMicState();

            if (event.error === 'no-speech') {
                systemStatus.textContent = 'No speech detected. Try again.';
            } else if (event.error === 'not-allowed') {
                systemStatus.textContent = 'Microphone Access Denied';
            } else {
                systemStatus.textContent = `Error: ${event.error}`;
            }

            setTimeout(() => {
                systemStatus.textContent = 'Ready';
            }, 3000);
        };

        recognition.onend = () => {
            // Only reset if we haven't already (onresult handles its own reset)
            if (isListening) {
                resetMicState();
                systemStatus.textContent = 'Ready';
            }
        };
    }

    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            resetMicState();
            systemStatus.textContent = 'Ready';
        } else {
            stopSpeaking();
            recognition.start();
        }
    });

    // --- Text Input ---
    async function sendTextMessage() {
        const text = textInput.value.trim();
        if (!text) return;
        textInput.value = '';
        appendMessage('user', text);
        systemStatus.textContent = 'Processing...';
        await processText(text);
    }

    sendBtn.addEventListener('click', sendTextMessage);

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    });

    function resetMicState() {
        isListening = false;
        micBtn.classList.remove('recording');
        recordingPulse.classList.add('hidden');
    }

    // Speech Synthesis Setup (TTS)
    const synth = window.speechSynthesis;
    let currentAudio = null;

    async function speak(text) {
        stopSpeaking(); // Cancel any ongoing speech

        // Remove text between asterisks (e.g. *blushes*) for spoken audio
        const spokenText = (text || '').replace(/\*[\s\S]*?\*/g, '').trim();
        if (!spokenText) return;

        systemStatus.textContent = 'Generating Voice...';

        try {
            // Attempt to use Voicevox through our backend proxy
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: spokenText, speaker: activeCharacterVoiceId })
            });

            if (!response.ok) throw new Error('Voicevox unavailable');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);

            currentAudio.onplay = () => systemStatus.textContent = 'Speaking...';
            currentAudio.onended = () => {
                systemStatus.textContent = 'Ready';
                URL.revokeObjectURL(audioUrl); // Cleanup memory
                currentAudio = null;
            };
            currentAudio.onerror = () => {
                console.error('Audio playback error');
                systemStatus.textContent = 'Ready';
                fallbackSpeak(text); // Fallback if audio file fails to play
            };

            await currentAudio.play();

        } catch (error) {
            console.warn('Voicevox failed, falling back to Web Speech API:', error);
            fallbackSpeak(spokenText);
        }
    }

    function fallbackSpeak(text) {
        const utterThis = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice => voice.name.includes('Google') || voice.lang === 'en-US');
        if (preferredVoice) utterThis.voice = preferredVoice;

        utterThis.pitch = 1;
        utterThis.rate = 1;

        utterThis.onstart = () => systemStatus.textContent = 'Speaking...';
        utterThis.onend = () => systemStatus.textContent = 'Ready';
        utterThis.onerror = (e) => {
            console.error('SpeechSynthesisError', e);
            systemStatus.textContent = 'Ready';
        };

        synth.speak(utterThis);
    }

    function stopSpeaking() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            systemStatus.textContent = 'Ready';
        }
        if (synth.speaking) {
            synth.cancel();
        }
    }

    // API Interaction — send text to LM Studio via backend
    async function processText(text) {
        micBtn.classList.add('processing');

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        // Prepare Avatar representation
        const aiAvatarHtml = (activeCharacterAvatar && activeCharacterAvatar.startsWith('/avatars/'))
            ? `<img src="${activeCharacterAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
            : activeCharacterAvatar || activeCharacterName.charAt(0).toUpperCase();

        const typingHTML = `
            <div id="${typingId}" class="message ai-message">
                <div class="avatar">${aiAvatarHtml}</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        chatHistory.insertAdjacentHTML('beforeend', typingHTML);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const currentPersonality = personalityText.value.trim() || initialWelcomeMessage;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    personality: currentPersonality,
                    characterName: activeCharacterName,
                    characterId: activeCharacterId
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            // Remove typing indicator
            document.getElementById(typingId).remove();

            // Add AI response to UI
            appendMessage('ai', data.response);

            // Update Live2D model mood expression
            if (data.mood && typeof window.live2dSetMood === 'function') {
                window.live2dSetMood(data.mood);
            }

            // Speak response
            speak(data.response);

        } catch (error) {
            console.error('Error fetching chat response:', error);
            document.getElementById(typingId).remove();
            appendMessage('ai', 'Sorry, there was an error connecting to LM Studio. Please ensure the server is running with a model loaded.');
            systemStatus.textContent = 'Ready';
        } finally {
            micBtn.classList.remove('processing');
        }
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');

        if (sender === 'user') {
            if (userProfile && userProfile.pfp) {
                const img = document.createElement('img');
                img.src = userProfile.pfp;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '12px';
                avatarDiv.appendChild(img);
                avatarDiv.style.background = 'transparent';
                avatarDiv.style.border = 'none';
            } else {
                avatarDiv.textContent = userProfile ? userProfile.name.charAt(0).toUpperCase() : 'U';
            }
        } else {
            if (activeCharacterAvatar && activeCharacterAvatar.startsWith('/avatars/')) {
                const img = document.createElement('img');
                img.src = activeCharacterAvatar;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '12px';
                avatarDiv.appendChild(img);
                avatarDiv.style.background = 'transparent';
                avatarDiv.style.border = 'none';
            } else {
                avatarDiv.textContent = activeCharacterAvatar || activeCharacterName.charAt(0).toUpperCase();
            }
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        chatHistory.appendChild(messageDiv);

        // Auto scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Ensure voices are loaded
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }
});

