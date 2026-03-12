document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('dashboardTheme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('dashboardTheme', newTheme);
        });
    }

    const characterList = document.getElementById('character-list');
    const toast = document.getElementById('toast');

    // Stats variables
    const statCount = document.getElementById('stat-count');
    const statLive2d = document.getElementById('stat-live2d');

    // Upload Form Elements
    const saveBtn = document.getElementById('upload-save-btn');
    const charName = document.getElementById('char-name');
    const charPersonality = document.getElementById('char-personality');
    const charZip = document.getElementById('char-zip');
    const zipDropArea = document.getElementById('zip-drop-area');
    const fileNameDisplay = document.getElementById('file-name');
    const searchInput = document.getElementById('character-search');

    // User Profile Elements
    const userProfileModal = document.getElementById('user-profile-modal');
    const openProfileBtn = document.getElementById('open-profile-btn');
    const closeUserProfile = document.getElementById('close-user-profile');
    const saveUserProfileBtn = document.getElementById('save-user-profile');
    const userNameInput = document.getElementById('user-name-input');
    const userPfpInput = document.getElementById('user-pfp-input');
    const userPfpPreview = document.getElementById('user-pfp-preview');
    const greetingTextH1 = document.querySelector('.greeting-text h1');
    const topProfilePic = document.querySelector('.profile-pic');

    // Toast helper
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.className = 'toast' + (isError ? ' toast-error' : '');
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }

    // File input visual feedback
    charZip.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.style.color = '#000';
            zipDropArea.style.borderColor = '#000';
        } else {
            fileNameDisplay.textContent = 'Click or drag ZIP model here';
            fileNameDisplay.style.color = '';
            zipDropArea.style.borderColor = '';
        }
    });

    // Drag and drop for ZIP area
    if (zipDropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zipDropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

        ['dragenter', 'dragover'].forEach(eventName => {
            zipDropArea.addEventListener(eventName, () => zipDropArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zipDropArea.addEventListener(eventName, () => zipDropArea.classList.remove('dragover'), false);
        });

        zipDropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                charZip.files = files;
                const event = new Event('change');
                charZip.dispatchEvent(event);
            }
        }, false);
    }

    // Fetch and render characters
    let allCharacters = [];

    async function loadCharacters() {
        try {
            characterList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">Loading characters...</div>';
            const res = await fetch('/api/characters');
            allCharacters = await res.json();

            // Update Stats
            if (statCount) statCount.textContent = allCharacters.length;
            if (statLive2d) statLive2d.textContent = allCharacters.filter(c => c.modelPath !== null && c.modelPath !== undefined).length;

            renderCharacters(allCharacters);
        } catch (err) {
            console.error('Failed to load characters:', err);
            characterList.innerHTML = '<div style="text-align:center; padding: 40px; color: #ef4444;">Failed to load characters. Ensure server is running.</div>';
        }
    }

    function renderCharacters(characters) {
        characterList.innerHTML = '';

        if (characters.length === 0) {
            characterList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">No characters matching your search. Create one on the right!</div>';
            return;
        }

        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';

            const avatarHtml = (char.avatar && char.avatar.startsWith('/avatars/'))
                ? `<img src="${char.avatar}" alt="${char.name}">`
                : char.avatar || char.name.charAt(0);

            const hasModel = char.modelPath ? 'Live2D' : 'Text Only';
            const modelIcon = char.modelPath
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

            item.innerHTML = `
                <div class="item-left">
                    <div class="item-avatar">${avatarHtml}</div>
                    <div class="item-info">
                        <strong>${char.name}</strong>
                        <span>${char.personality.substring(0, 40)}${char.personality.length > 40 ? '...' : ''}</span>
                    </div>
                </div>
                <div class="item-stats">
                    <div class="stat">
                        ${modelIcon}
                        <span>${hasModel}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-view chat-btn">Chat</button>
                    ${char.id !== 'default-miku' ? `<button class="arrow-btn delete-btn" style="border-color:#ffaaaa; color:#cc3333;" title="Delete">&times;</button>` : ''}
                </div>
            `;

            // Event Listeners for buttons
            const chatBtn = item.querySelector('.chat-btn');
            chatBtn.onclick = (e) => {
                e.stopPropagation();
                selectCharacter(char);
            };

            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Are you sure you want to delete ${char.name}?`)) return;

                    try {
                        const delRes = await fetch(`/api/characters/${char.id}`, { method: 'DELETE' });
                        if (!delRes.ok) throw new Error('Delete failed');
                        showToast(`${char.name} deleted.`);
                        loadCharacters();
                    } catch (err) {
                        showToast('Failed to delete character.', true);
                    }
                };
            }

            characterList.appendChild(item);
        });
    }

    // Select character and go to chat
    async function selectCharacter(char) {
        localStorage.setItem('activeCharacter', JSON.stringify(char));

        try {
            await fetch('/api/personality', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personality: char.personality })
            });
            window.location.href = '/index.html';
        } catch (err) {
            showToast('Failed to switch character context.', true);
        }
    }

    // Filter characters
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filteredChars = allCharacters.filter(c =>
                c.name.toLowerCase().includes(term) ||
                (c.personality && c.personality.toLowerCase().includes(term))
            );
            renderCharacters(filteredChars);
        });
    }

    // Handle Upload
    saveBtn.addEventListener('click', async () => {
        const name = charName.value.trim();
        const personality = charPersonality.value.trim();
        const file = charZip.files[0];

        if (!name || !personality) {
            showToast('Name and personality are required.', true);
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('name', name);
        formData.append('personality', personality);
        if (file) {
            formData.append('modelZip', file);
        }

        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            showToast('✨ Character added successfully!');

            // clear form
            charName.value = '';
            charPersonality.value = '';
            charZip.value = '';
            fileNameDisplay.textContent = 'Click or drag ZIP model here';
            fileNameDisplay.style.color = '';
            zipDropArea.style.borderColor = '';

            loadCharacters(); // Refresh list
        } catch (err) {
            console.error('Upload Error:', err);
            showToast('Failed to upload character.', true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Upload Character';
        }
    });

    // --- User Profile Logic ---
    async function loadUserProfile() {
        try {
            const res = await fetch('/api/user/profile');
            const user = await res.json();
            
            // Update UI
            if (greetingTextH1) greetingTextH1.textContent = `Hello ${user.name}!`;
            userNameInput.value = user.name;
            
            const pfpHtml = user.pfp 
                ? `<img src="${user.pfp}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">` 
                : user.name.charAt(0).toUpperCase();
            
            if (topProfilePic) topProfilePic.innerHTML = pfpHtml;
            if (userPfpPreview) userPfpPreview.innerHTML = pfpHtml;
            
            // Store locally for chat page access
            localStorage.setItem('userProfile', JSON.stringify(user));
        } catch (err) {
            console.error('Failed to load user profile:', err);
        }
    }

    if (openProfileBtn) {
        openProfileBtn.onclick = () => userProfileModal.classList.add('visible');
    }
    if (closeUserProfile) {
        closeUserProfile.onclick = () => userProfileModal.classList.remove('visible');
    }

    // Modal click-outside to close
    userProfileModal.addEventListener('click', (e) => {
        if (e.target === userProfileModal) userProfileModal.classList.remove('visible');
    });

    // PFP Preview Logic
    if (userPfpInput) {
        userPfpInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    userPfpPreview.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    saveUserProfileBtn.onclick = async () => {
        const name = userNameInput.value.trim();
        const pfpFile = userPfpInput.files[0];

        if (!name) {
            showToast('Name is required.', true);
            return;
        }

        saveUserProfileBtn.disabled = true;
        saveUserProfileBtn.textContent = 'Saving...';

        const formData = new FormData();
        formData.append('name', name);
        if (pfpFile) formData.append('pfp', pfpFile);

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Update failed');
            
            showToast('Profile updated!');
            userProfileModal.classList.remove('visible');
            loadUserProfile();
        } catch (err) {
            showToast('Failed to update profile.', true);
        } finally {
            saveUserProfileBtn.disabled = false;
            saveUserProfileBtn.textContent = 'Save Changes';
        }
    };

    // Initial load
    loadCharacters();
    loadUserProfile();
});
