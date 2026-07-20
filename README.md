# 🔴 RED QUEEN AI — Neural Core & Holographic Interface

[![License](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg)](LICENSE)

> **Umbrella Corporation Artificial Intelligence Core System**  
> Developed by **MesxlitySolutions**

📋 **[Jury Evaluation & Biometric Registration Guide](JURY_GUIDE.md)**  
💻 **Recommended Mode**: Run locally for zero-latency evaluation  
🔐 **Local Admin Gateway**: `http://localhost:5173/backend` *(Password: `P@ssw0rd`)*

---

## 📌 Project Overview

**Red Queen AI** is a futuristic, Resident Evil-inspired artificial intelligence security core and holographic interactive terminal. Built with advanced multi-model fallback AI routing, real-time voice synthesis, and facial biometric authentication, the Red Queen serves as an authoritative technological guardian.

---

## ✨ Key Features

- **🧠 Multi-Tier Gemini AI Engine**: Powered by Google GenAI with automated fallback routing across Gemini models (`gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`, etc.) to guarantee continuous operational uptime even under API rate limits.
- **🔊 Voice Synthesis (Google Cloud TTS)**: Integrated REST TTS synthesis utilizing `en-US-Wavenet-F` with clean pre-processing sanitization for markdown, code blocks, and symbols.
- **🛡️ Scope-Restricted Protocol**: Programmed strictly for technology domains including Cybersecurity, Hacking, Networking, SAS Compliance, and Software Engineering. Refuses non-tech queries in character with clinical security error codes.
- **👤 Facial Biometric Security**: Local biometric authentication using euclidean vector distance matching to register, identify, and manage security clearance roles.
- **💎 Interactive Holographic UI**: Modern WebGL/Canvas red holographic visualizer interface built with React, Vite, and high-performance micro-animations.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, HTML5 Canvas / CSS3 |
| **Backend** | Node.js, Express.js, Axios, CORS |
| **AI Engine** | `@google/genai` (Gemini SDK) |
| **Voice Audio** | Google Cloud Text-to-Speech REST API |
| **Biometrics** | Euclidean Vector Descriptor Distance Matching |

---

## 🚀 Quick Start Guide for Judges

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)

---

### 1️⃣ Server Setup (Backend)

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
   *Example `.env` configuration:*
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GOOGLE_TTS_KEY=your_google_tts_key_here
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```
   *The backend neural core will run at `http://localhost:3000`.*

---

### 2️⃣ Client Setup (Frontend)

1. Open a second terminal window and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open the printed local URL (typically `http://localhost:5173`) in your browser to interact with the Red Queen.

---

## 📁 Repository Structure

```text
red-queen-project/
├── client/                 # React + Vite Frontend Application
│   ├── src/                # Hologram UI, Chat Terminal & Biometrics
│   ├── public/             # Static Assets & Models
│   └── vite.config.ts      # Vite configuration & API proxy
├── server/                 # Express.js Backend Neural Core
│   ├── server.js           # Main server script (Gemini, TTS & Biometrics API)
│   ├── db/                 # Local user biometrics storage (users.json)
│   ├── .env.example        # Environment variables template
│   └── package.json        # Backend dependencies
├── .gitignore              # Excludes sensitive .env files and node_modules
├── LICENSE                 # Intellectual Property & Copyright Notice
└── README.md               # Project documentation
```

---

## 📜 Intellectual Property & License

Copyright © 2026 **MesxlitySolutions (Rabih Rizkallah)**. All Rights Reserved.

Permission is granted exclusively to the designated judging committee and reviewers to view, inspect, and evaluate this codebase for competition scoring purposes. See [LICENSE](LICENSE) for full details.
