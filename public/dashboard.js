document.addEventListener('DOMContentLoaded', () => {
    const characterGrid = document.getElementById('character-grid');
    const toast = document.getElementById('toast');

    // Upload Modal
    const addCharBtn = document.getElementById('add-character-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeBtn = document.getElementById('upload-close-btn');
    const cancelBtn = document.getElementById('upload-cancel-btn');
    const saveBtn = document.getElementById('upload-save-btn');

    // Form elements
    const charName = document.getElementById('char-name');
    const charPersonality = document.getElementById('char-personality');
    const charWelcome = document.getElementById('char-welcome');
    const charAvatar = document.getElementById('char-avatar');
    const charZip = document.getElementById('char-zip');
    const fileNameDisplay = document.getElementById('file-name');

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

    // Modal behavior
    function openModal() {
        uploadModal.classList.remove('hidden');
        requestAnimationFrame(() => uploadModal.classList.add('visible'));
        charName.value = '';
        charPersonality.value = '';
        charWelcome.value = '';
        charAvatar.value = '';
        charZip.value = '';
        fileNameDisplay.textContent = '';
    }

    function closeModal() {
        uploadModal.classList.remove('visible');
        setTimeout(() => uploadModal.classList.add('hidden'), 250);
    }

    addCharBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // File input visual feedback
    charZip.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.style.color = 'var(--text-primary)';
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    // Fetch and render characters
    async function loadCharacters() {
        try {
            characterGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-secondary);">Loading characters...</div>';
            const res = await fetch('/api/characters');
            const characters = await res.json();

            characterGrid.innerHTML = '';

            if (characters.length === 0) {
                characterGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-secondary);">No characters found. Add one!</div>';
                return;
            }

            characters.forEach(char => {
                const card = document.createElement('div');
                card.className = 'character-card';
                card.onclick = () => selectCharacter(char);

                const avatarHtml = (char.avatar && char.avatar.startsWith('/avatars/'))
                    ? `<img src="${char.avatar}" alt="${char.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                    : char.avatar || char.name.charAt(0);

                card.innerHTML = `
                    <div class="char-avatar">${avatarHtml}</div>
                    <div class="char-info">
                        <div class="char-name">${char.name}</div>
                        <div class="char-desc">${char.modelPath ? 'Live2D Model Included' : 'Text Only'}</div>
                    </div>
                `;

                if (char.id !== 'default-miku') {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'char-delete-btn';
                    deleteBtn.innerHTML = '&times;';
                    deleteBtn.title = 'Delete Character';
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
                    card.appendChild(deleteBtn);
                }

                characterGrid.appendChild(card);
            });
        } catch (err) {
            console.error('Failed to load characters:', err);
            characterGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #ef4444;">Failed to load characters. Ensure server is running.</div>';
        }
    }

    // Select character and go to chat
    async function selectCharacter(char) {
        // Save to localStorage for index.html to read
        localStorage.setItem('activeCharacter', JSON.stringify(char));

        // Update the backend personality so context is correct
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

    // Handle Upload
    saveBtn.addEventListener('click', async () => {
        const name = charName.value.trim();
        const personality = charPersonality.value.trim();
        const welcomeMessage = charWelcome.value.trim();
        const file = charZip.files[0];
        const avatarImage = charAvatar.files[0];

        if (!name || !personality) {
            showToast('Name and personality are required.', true);
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('name', name);
        formData.append('personality', personality);
        if (welcomeMessage) formData.append('welcomeMessage', welcomeMessage);
        if (avatarImage) formData.append('avatarImage', avatarImage);
        if (file) {
            formData.append('modelZip', file);
        }

        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                body: formData // No Content-Type header, browser sets it with appropriate boundary for FormData
            });

            if (!res.ok) throw new Error('Upload failed');

            closeModal();
            showToast('✨ Character added successfully!');
            loadCharacters(); // Refresh grid
        } catch (err) {
            console.error('Upload Error:', err);
            showToast('Failed to upload character.', true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Upload Character';
        }
    });

    // Initial load
    loadCharacters();
});
