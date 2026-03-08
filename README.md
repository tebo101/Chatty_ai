<div align="center">
  <h1>🌟 Chatty.ai AI Chatbot</h1>
  <p>An interactive, highly personalized AI Chatbot featuring dynamic Live2D avatars and seamless voice conversations powered by the Local LM STUDIO.</p>
</div>

---

## ✨ Features

- **Interactive Live2D Avatars:** Engage with responsive Live2D characters (default: Hatsune Miku) that react and change expressions based on the AI's mood. Built with PixiJS and the Cubism SDK.
- **Advanced AI Brain:** Powered by the **LM STUDIO** for natural, private, and locally.
- **Voice Interaction:** Supports Speech-to-Text (STT) for hands-free input and Text-to-Speech (TTS) so your character can speak back to you.
- **Character Dashboard:** A dedicated dashboard for uploading and managing custom Live2D models. Connect your own Cubism 3/4 characters instantly!
- **Local Server Setup:** Easy to spin up and run using Node.js and Express.

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- LM STUDIO

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Chatty_AI.git
   cd Chatty_AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Add LM STudIO URL like this:
     ```env
     LM_STUDIO_URL=your_url_here
     ```

4. **Start the server:**
   ```bash
   npm start
   ```
   *(If `npm start` is not configured, run `node server.js`)*

5. **Open the App:**
   - Chat Interface: Access `http://localhost:3000` in your web browser.
   - Character Dashboard: Access `http://localhost:3000/dashboard.html` to manage models.

## 🛠️ Built With

- **Frontend:** HTML5, Vanilla JavaScript, CSS3
- **Backend:** Node.js, Express.js
- **Graphics/Avatars:** [PixiJS](https://pixijs.com/), [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- **AI / LLM:** LM studio
- **File Uploads:** Multer

## 📂 Project Structure

```text
Chatty_ai/
├── public/                # Frontend assets (HTML, CSS, Client-side JS)
│   ├── models/            # Uploaded Live2D character models
│   ├── live2d/            # Default Live2D model assets
│   ├── app.js             # Main frontend chatbot logic
│   ├── live2d.js          # Live2D rendering engine implementation
│   └── dashboard.html     # Character management interface
├── uploads/               # Temporary storage for model uploads
├── server.js              # Express Backend Server setup
├── package.json           # Node project metadata and dependencies
└── .env                   # Environment variables (API Keys)
```

