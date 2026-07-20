# 📋 JURY & EVALUATOR LOCAL TESTING & BIOMETRIC REGISTRATION GUIDE

> **Red Queen AI — Neural Core & Holographic Interface**  
> Developed by **MesxlitySolutions (Rabih Rizkallah)**

> [!IMPORTANT]  
> **RECOMMENDED EVALUATION MODE**: For the smoothest and fastest experience without cloud free-tier latency or hosting constraints, **please run and evaluate this project LOCALLY** on your machine using the instructions below.

---

## ⚡ Quick Start: Running the Project Locally

Follow these step-by-step commands to launch both the backend server and frontend terminal on your computer.

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (included with Node.js)
- A working **Webcam** (for facial biometrics recognition)

---

### Step 1: Launch the Backend Server

Open your terminal or Command Prompt in the project root directory and run:

```bash
# Navigate into the server folder
cd server

# Install backend dependencies
npm install

# Create environment configuration file from template
cp .env.example .env

# Start the neural core server
npm start
```

*The backend server will launch at `http://localhost:3000`.*

> [!NOTE]
> Keep this terminal window open while evaluating the project.

---

### Step 2: Launch the Frontend Holographic Client

Open a **second terminal window** in the project root directory and run:

```bash
# Navigate into the client folder
cd client

# Install frontend dependencies
npm install

# Start the Vite development web server
npm run dev
```

*The frontend application will launch at `http://localhost:5173`.*

---

## 🔑 Biometric Admin Gateway Access

To enroll your custom facial biometric signature into the local database registry:

- **Local Admin Registry URL**: `http://localhost:5173/backend`
- **Security Access Password**: `P@ssw0rd`

---

## 👤 Step-by-Step Biometric Registration Process

### Step 1: Open the Admin Gateway
Open `http://localhost:5173/backend` in your Google Chrome, Edge, or Firefox browser.

### Step 2: Authenticate Admin Access
1. Enter the password: `P@ssw0rd`
2. Click **Authenticate Access**.

### Step 3: Configure Your Officer Profile
On the right-hand panel (**Biometric Enrollment Node**):
1. Enter your **Officer Name** (e.g., `Judge Smith`, `Evaluator Rabih`).
2. Select a **Security Clearance Role** (e.g., `Lead Evaluator`, `Umbrella Executive`, `Security Officer`).

### Step 4: Engage the Camera Scanner
1. Click **`[ ENGAGE BIOMETRIC CAMERA ]`**.
2. When prompted by your browser, click **Allow** to enable camera access.
3. Position your face in front of the camera so the cyan/red holographic grid overlay locks onto your facial landmarks.

### Step 5: Capture & Register Profile
1. Click **`[ CAPTURE & REGISTER PROFILE ]`**.
2. You will see a success confirmation banner: `SUCCESS: ENROLLED <NAME> AS <ROLE>`.
3. Your 128-float facial vector signature is now stored locally in `server/db/users.json`.

---

## 🧪 Testing Facial Recognition & AI Terminal Access

1. Click **`[ Logscreen Terminal ]`** at the top right (or go to `http://localhost:5173`).
2. Align your face with the Red Queen scanner.
3. The biometric engine will match your facial geometry against the local registry database.
4. Upon matching, the HUD displays:
   `IDENTITY VERIFIED: WELCOME <YOUR NAME>`
5. You are granted access to the **Red Queen AI Terminal** with real-time text and voice audio synthesis!

---

## 🌐 Online Reference Links (Optional)

If needed, live hosted links are available below:
- **Main Terminal**: [https://red-queen-project.vercel.app/](https://red-queen-project.vercel.app/)
- **Admin Registry**: [https://red-queen-project.vercel.app/backend](https://red-queen-project.vercel.app/backend) *(Password: `P@ssw0rd`)*

---

*Copyright © 2026 MesxlitySolutions (Rabih Rizkallah). All Rights Reserved.*
