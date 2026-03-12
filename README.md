<div align="center">
  <h1>🌟 Chatty_AI Chatbot</h1>
  <p>An interactive, highly personalized AI Chatbot featuring dynamic Live2D avatars and seamless voice conversations powered by LM Studio and Voicevox.</p>
</div>

---

## ✨ Features

- **Interactive Live2D Avatars:** Engage with responsive Live2D characters (default: Hatsune Miku) that react and change expressions based on the AI's mood. Built with PixiJS and the Cubism SDK.
- **Advanced AI Brain:** Powered by **LM Studio** for natural, context-aware, and local conversations.
- **Voice Interaction:** Supports Speech-to-Text (STT) for hands-free input and **Voicevox** Text-to-Speech (TTS) with expressive Japanese voices.
- **Character Dashboard:** A dedicated dashboard for uploading and managing custom Live2D models. Connect your own Cubism 3/4 characters instantly!
- **User Profiles:** Customize your own name and profile picture to make the experience truly personal.
- **Automated Lifecycle:** Voicevox engine starts and stops automatically with the server.

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [LM Studio](https://lmstudio.ai/) running with a loaded model and local server enabled.
- [Voicevox](https://voicevox.hiroshiba.jp/) installed locally.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tebo101/Chatty_ai.git
   cd Chatty_ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Configure paths and URLs:
     ```env
     PORT=3000
     LM_STUDIO_URL=http://localhost:1234
     LM_STUDIO_MODEL=your-model-name
     VOICEVOX_ENGINE_PATH=C:\path\to\voicevox\run.exe
     NGROK_AUTHTOKEN=your_ngrok_token
     ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open the App:**
   - Chat Interface: Access `http://localhost:3000` in your web browser.
   - Character Dashboard: Access `http://localhost:3000/dashboard.html` to manage models.

## 🛠️ Built With

- **Frontend:** HTML5, Vanilla JavaScript, CSS3
- **Backend:** Node.js, Express.js
- **Graphics/Avatars:** [PixiJS](https://pixijs.com/), [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- **AI / LLM:** [LM Studio](https://lmstudio.ai/)
- **TTS:** [Voicevox](https://voicevox.hiroshiba.jp/)
- **File Uploads:** Multer

## 📂 Project Structure

```text
Chatty_ai/
├── public/                # Frontend assets (HTML, CSS, Client-side JS)
│   ├── models/            # Uploaded Live2D character models
│   ├── avatars/           # Character and user avatars
│   ├── user_pfp/          # (Temporary) User profile pictures
│   ├── app.js             # Main frontend chatbot logic
│   ├── live2d.js          # Live2D rendering engine implementation
│   └── dashboard.html     # Character management interface
├── internal/              # Local data storage (User profile, etc.)
├── uploads/               # Temporary storage for model uploads
├── server.js              # Express Backend Server setup
├── characters.json        # Character metadata storage
├── package.json           # Node project metadata and dependencies
└── .env                   # Environment variables (API Keys)
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check out the [issues page](https://github.com/tebo101/Chatty_ai/issues).

## 📝 License

This project is licensed under the **ISC License**.
