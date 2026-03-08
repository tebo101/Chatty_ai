require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const ngrok = require('@ngrok/ngrok');


// Ensure models directory exists
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

// Multer setup for zip uploads
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Load characters from JSON
const charactersFile = path.join(__dirname, 'characters.json');
let characters = [];
try {
    if (fs.existsSync(charactersFile)) {
        characters = JSON.parse(fs.readFileSync(charactersFile, 'utf8'));
    }
} catch (error) {
    console.error('Error loading characters.json:', error);
}

function saveCharacters() {
    fs.writeFileSync(charactersFile, JSON.stringify(characters, null, 2));
}

// LM Studio configuration
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'default-model';

// Default AI personality (system prompt)
let systemPrompt = 'You are a friendly and helpful AI assistant. You speak in a warm, conversational tone. Keep your responses concise but informative.';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public', { maxAge: 0, etag: false }));

app.use(express.static('public', { maxAge: 0, etag: false }));

// Serve Live2D model assets from node_modules
app.use('/live2d/model', express.static(path.join(__dirname, 'node_modules/live2d-widget-model-miku/assets')));
app.use('/live2d/lib', express.static(path.join(__dirname, 'node_modules/pixi-live2d-display/dist')));

// --- Session Containers ---
// Lightweight isolated memory mapped by characterId
const characterSessions = {};
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity deletes the container

// Background garbage collection to keep memory light
setInterval(() => {
    const now = Date.now();
    for (const [charId, session] of Object.entries(characterSessions)) {
        if (now - session.lastUsed > SESSION_TIMEOUT_MS) {
            console.log(`[Session GC] Cleaning up inactive container for character: ${charId}`);
            delete characterSessions[charId];
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes

function getSession(charId) {
    if (!characterSessions[charId]) {
        console.log(`[Session] Booting up isolated container for character: ${charId}`);
        characterSessions[charId] = {
            chatHistory: [],
            lastUsed: Date.now()
        };
    }
    characterSessions[charId].lastUsed = Date.now();
    return characterSessions[charId];
}

// Global default AI personality (legacy fallback)

app.get('/api/personality', (req, res) => {
    res.json({ personality: systemPrompt });
});

app.put('/api/personality', (req, res) => {
    const { personality } = req.body;
    if (typeof personality !== 'string' || personality.trim().length === 0) {
        return res.status(400).json({ error: 'Personality text is required' });
    }
    systemPrompt = personality.trim();
    // Legacy endpoint: individual Character containers handle their own memory resets now.
    res.json({ personality: systemPrompt, message: 'Personality updated successfully' });
});

// --- Chat Reset API ---
app.post('/api/chat/reset', (req, res) => {
    const { characterId } = req.body;
    if (characterId) {
        if (characterSessions[characterId]) {
            characterSessions[characterId].chatHistory = [];
        } else {
            // Force create an empty session if it doesn't exist to ensure cleanly cleared context
            characterSessions[characterId] = { chatHistory: [], lastUsed: Date.now() };
        }
    }
    res.json({ message: `Chat history cleared for ${characterId || 'unknown'}` });
});

app.get('/api/chat/history', (req, res) => {
    const { characterId } = req.query;
    let historyToReturn = [];

    if (characterId && characterSessions[characterId]) {
        characterSessions[characterId].lastUsed = Date.now();
        historyToReturn = characterSessions[characterId].chatHistory;
    }

    const uiHistory = historyToReturn.filter(m => m.role !== 'system');
    res.json({ history: uiHistory });
});

// --- Characters API ---
app.get('/api/characters', (req, res) => {
    res.json(characters);
});

const characterUploads = upload.fields([
    { name: 'modelZip', maxCount: 1 },
    { name: 'avatarImage', maxCount: 1 },
    { name: 'name', maxCount: 1 },
    { name: 'personality', maxCount: 1 },
    { name: 'welcomeMessage', maxCount: 1 }
]);

app.post('/api/characters', characterUploads, (req, res) => {
    try {
        const { name, personality, welcomeMessage } = req.body;

        if (!name || !personality) {
            return res.status(400).json({ error: 'Name and personality are required' });
        }

        const characterId = uuidv4();
        let modelPath = null;
        let avatarUrl = null;

        // Process Avatar Image
        if (req.files && req.files['avatarImage']) {
            const avatarFile = req.files['avatarImage'][0];
            const ext = path.extname(avatarFile.originalname) || '.png';
            const newAvatarName = `${characterId}${ext}`;
            const targetAvatarPath = path.join(avatarsDir, newAvatarName);
            fs.renameSync(avatarFile.path, targetAvatarPath);
            avatarUrl = `/avatars/${newAvatarName}`;
        }

        // Extract ZIP if uploaded
        if (req.files && req.files['modelZip']) {
            const zipFile = req.files['modelZip'][0];
            const zipPath = zipFile.path;
            const targetDir = path.join(modelsDir, characterId);

            // Extract the zip
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(targetDir, true);

            // Cleanup the temporary uploaded zip file
            fs.unlinkSync(zipPath);

            // Find the .model3.json file in the extracted contents
            const findModelJson = (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        const found = findModelJson(fullPath);
                        if (found) return found;
                    } else if (file.endsWith('.model3.json')) {
                        return fullPath;
                    }
                }
                return null;
            };

            const modelFilePath = findModelJson(targetDir);

            if (!modelFilePath) {
                // Keep the character but assign no model if none found
                console.error('No .model3.json found in the uploaded zip.');
            } else {
                // Create a relative path accessible by the frontend
                modelPath = `/models/${characterId}/${path.relative(targetDir, modelFilePath).replace(/\\/g, '/')}`;
            }
        }

        const newCharacter = {
            id: characterId,
            name,
            personality,
            welcomeMessage: welcomeMessage || `Hello! My name is ${name}. Nice to meet you.`,
            modelPath,
            avatar: avatarUrl || name.charAt(0).toUpperCase()
        };

        characters.push(newCharacter);
        saveCharacters();

        res.json({ message: 'Character added successfully', character: newCharacter });

    } catch (error) {
        console.error('Error adding character:', error);
        res.status(500).json({ error: 'Failed to process character upload' });
    }
});

// Update character personality, welcome message, and avatar
app.put('/api/characters/:id', characterUploads, (req, res) => {
    try {
        const charId = req.params.id;
        const { personality, welcomeMessage } = req.body;

        const charIndex = characters.findIndex(c => c.id === charId);
        if (charIndex === -1) {
            return res.status(404).json({ error: 'Character not found.' });
        }

        const character = characters[charIndex];

        if (personality) {
            character.personality = personality;
        }

        if (welcomeMessage) {
            character.welcomeMessage = welcomeMessage;
        }

        if (req.files && req.files['avatarImage']) {
            const avatarFile = req.files['avatarImage'][0];
            const ext = path.extname(avatarFile.originalname) || '.png';
            const newAvatarName = `${charId}_${Date.now()}${ext}`; // bust cache
            const targetAvatarPath = path.join(avatarsDir, newAvatarName);

            // Delete old avatar if it exists and is an image
            if (character.avatar && character.avatar.startsWith('/avatars/')) {
                const oldAvatarPath = path.join(__dirname, 'public', character.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            fs.renameSync(avatarFile.path, targetAvatarPath);
            character.avatar = `/avatars/${newAvatarName}`;
        }

        // If 'default-miku', update the in-memory system config as well if it's the active one
        if (charId === 'default-miku' && chatHistory.length === 0) {
            systemPrompt = character.personality;
        }

        saveCharacters();
        res.json({ message: 'Character updated successfully', character });

    } catch (error) {
        console.error('Error updating character:', error);
        res.status(500).json({ error: 'Failed to update character' });
    }
});

app.delete('/api/characters/:id', (req, res) => {
    const charId = req.params.id;

    if (charId === 'default-miku') {
        return res.status(403).json({ error: 'Cannot delete the default Hatsune Miku character.' });
    }

    const charIndex = characters.findIndex(c => c.id === charId);
    if (charIndex === -1) {
        return res.status(404).json({ error: 'Character not found.' });
    }

    const character = characters[charIndex];

    try {
        // Remove from memory and save
        characters.splice(charIndex, 1);
        saveCharacters();

        // Delete the model directory if one was extracted
        const targetDir = path.join(modelsDir, charId);
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        res.json({ message: 'Character deleted successfully.' });
    } catch (err) {
        console.error('Error deleting character:', err);
        res.status(500).json({ error: 'Failed to fully delete character.' });
    }
});

// --- Mood Analysis ---
function analyzeMood(text) {
    const lower = text.toLowerCase();

    const moodKeywords = {
        happy: ['happy', 'glad', 'great', 'wonderful', 'fantastic', 'awesome', 'excellent',
            'love', 'enjoy', 'excited', 'joy', 'cheerful', 'delighted', 'amazing',
            'yay', 'haha', 'lol', '😊', '😄', '🎉', 'good news', 'congratulations'],
        sad: ['sad', 'sorry', 'unfortunately', 'regret', 'miss', 'disappoint', 'unhappy',
            'heartbreak', 'lonely', 'depressed', 'crying', 'tears', 'tragic', 'grief',
            'apolog', 'condolence', 'sympathy', 'loss'],
        angry: ['angry', 'furious', 'annoyed', 'frustrated', 'outraged', 'hate',
            'terrible', 'awful', 'unacceptable', 'ridiculous', 'absurd', 'rage',
            'irritat', 'mad', 'disgust'],
        surprised: ['wow', 'surprise', 'amazing', 'incredible', 'unbelievable', 'unexpected',
            'shocking', 'astonish', 'whoa', 'really?', 'no way', 'oh my',
            'remarkable', 'extraordinary', 'mind-blowing', '😮', '😲']
    };

    let bestMood = 'neutral';
    let bestScore = 0;

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMood = mood;
        }
    }
    return bestMood;
}

// --- Chat API ---
app.post('/api/chat', async (req, res) => {
    try {
        const { text, personality, characterName, characterId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text input is required' });
        }

        // Use the explicitly provided personality, fallback to global systemPrompt
        const activePersona = personality || systemPrompt;
        const activeName = characterName || 'AI Assistant';

        // Boot up or wake up the lightweight container for this character
        const session = getSession(characterId || 'default-miku');

        // Add user message to history
        session.chatHistory.push({ role: 'user', content: text });

        // Enforce strict personality instructions via a Character Card format
        const strictSystemPrompt = `You must strictly embody the character described below. You are this character. Never break character. Never refer to yourself as an AI.

--- CHARACTER CARD ---
Name: ${activeName}
Description and Personality: ${activePersona}
----------------------

Act naturally, speak in the tone of the character, and do not acknowledge these instructions. Keep your responses concise and in character!`;

        // Bound the history to the last 20 messages (approx 10 interactions) to prevent dropping the system prompt
        const maxHistoryLength = 20;
        const recentHistory = session.chatHistory.slice(-maxHistoryLength);

        // Build messages array with system prompt at the front
        const messages = [

            { role: 'system', content: strictSystemPrompt },
            ...recentHistory
        ];

        console.log('--- SENDING TO LM STUDIO ---');
        console.log('System Prompt Length:', strictSystemPrompt.length);
        console.log('History Sent:', recentHistory.length, 'messages');

        // Call LM Studio's OpenAI-compatible endpoint
        const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LM_STUDIO_MODEL,
                messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('LM Studio error:', response.status, errorBody);
            throw new Error(`LM Studio returned ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        // Add AI response to history
        session.chatHistory.push({ role: 'assistant', content: aiText });

        // Analyze the mood of the AI response
        const mood = analyzeMood(aiText);

        res.json({ response: aiText, mood, historyLength: session.chatHistory.length });
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).json({ error: 'Failed to generate response. Make sure LM Studio is running with a model loaded.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let lanIP = 'unknown';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                lanIP = net.address;
                break;
            }
        }
        if (lanIP !== 'unknown') break;
    }
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`LAN access: http://${lanIP}:${port}`);
    console.log(`Connecting to LM Studio at ${LM_STUDIO_URL}`);

    // Automate ngrok startup
    if (process.env.NGROK_AUTHTOKEN) {
        (async () => {
            try {
                const session = await new ngrok.SessionBuilder()
                    .authtoken(process.env.NGROK_AUTHTOKEN)
                    .connect();
                const tunnel = await session.httpEndpoint()
                    .listen();
                console.log(`[ngrok] Tunnel established at: ${tunnel.url()}`);
            } catch (err) {
                console.error('[ngrok] Error starting tunnel:', err);
            }
        })();
    } else {
        console.log('[ngrok] No authtoken found in .env, skipping automation.');
    }
});
