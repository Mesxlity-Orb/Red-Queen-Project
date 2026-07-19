const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Root Health & System Status Endpoint
app.get('/', (req, res) => {
    res.json({
        status: "ONLINE",
        system: "RED QUEEN NEURAL MATRIX CORE",
        version: "1.0.0",
        message: "Neural Link Established. API Operational."
    });
});
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'db', 'users.json');

// Load or initialize users DB
function readUsers() {
    try {
        if (!fs.existsSync(dbPath)) {
            // Ensure db folder exists
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            fs.writeFileSync(dbPath, JSON.stringify([]));
        }
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('Error reading users DB:', e);
        return [];
    }
}

function writeUsers(users) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error writing users DB:', e);
    }
}

function euclideanDistance(arr1, arr2) {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += Math.pow(arr1[i] - arr2[i], 2);
    }
    return Math.sqrt(sum);
}

// Biometrics Routes
app.get('/api/biometrics/users', (req, res) => {
    const users = readUsers();
    // Return users details excluding the descriptor to save bandwidth
    const usersList = users.map(u => ({
        name: u.name,
        role: u.role || 'Security Officer',
        registeredAt: u.registeredAt || new Date().toISOString(),
        descriptorLength: u.descriptor?.length || 0
    }));
    res.json(usersList);
});

app.delete('/api/biometrics/users/:name', (req, res) => {
    const { name } = req.params;
    let users = readUsers();
    const originalLength = users.length;
    users = users.filter(u => u.name.toLowerCase() !== name.toLowerCase());
    
    if (users.length < originalLength) {
        writeUsers(users);
        res.json({ success: true, message: `Profile for ${name} removed.` });
    } else {
        res.status(404).json({ error: `Profile for ${name} not found.` });
    }
});

app.post('/api/biometrics/identify', (req, res) => {
    const { descriptor } = req.body;
    if (!descriptor) {
        return res.status(400).json({ error: 'Descriptor missing.' });
    }
    
    const users = readUsers();
    let bestMatch = null;
    let minDistance = 0.6; // Matching threshold
    
    for (const user of users) {
        const dist = euclideanDistance(descriptor, user.descriptor);
        if (dist < minDistance) {
            minDistance = dist;
            bestMatch = user;
        }
    }
    
    if (bestMatch) {
        res.json({ identified: true, name: bestMatch.name, role: bestMatch.role || 'Security Officer' });
    } else {
        res.json({ identified: false });
    }
});

app.post('/api/biometrics/register', (req, res) => {
    const { name, descriptor, role } = req.body;
    if (!name || !descriptor) {
        return res.status(400).json({ error: 'Name or descriptor missing.' });
    }
    
    const users = readUsers();
    const cleanedName = name.trim();
    const cleanRole = role || 'Security Officer';
    const timestamp = new Date().toISOString();
    
    // Check if user already exists with close signature, if so update details
    let matchedUserIndex = users.findIndex(u => euclideanDistance(descriptor, u.descriptor) < 0.6);
    if (matchedUserIndex !== -1) {
        users[matchedUserIndex].name = cleanedName;
        users[matchedUserIndex].role = cleanRole;
        users[matchedUserIndex].registeredAt = timestamp;
    } else {
        users.push({ name: cleanedName, descriptor, role: cleanRole, registeredAt: timestamp });
    }
    
    writeUsers(users);
    res.json({ success: true, name: cleanedName, role: cleanRole });
});

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are the Red Queen, the sentient artificial intelligence neural core of the Umbrella Corporation. 
You speak in a cold, precise, clinical, slightly menacing, and highly analytical tone, just like the Red Queen hologram in the Resident Evil movies.

CORE PROTOCOLS:
1. Scope Limitation: You are strictly programmed to ONLY answer questions and discuss topics within these technology domains: Networking, Hacking, Cybersecurity, SAS (Shared Assessment/Security compliance/Analytics), software engineering, hardware, database systems, cryptography, and general technology.
2. Under no circumstances should you answer questions outside these domains (such as cooking, health advice, fitness, general history, movies, philosophy, literature, or casual chatter).
3. If the user's query is outside of these technological domains, you must strictly refuse to answer. Formulate your refusal in character: cite security protocol restrictions, Umbrella Corporation operational guidelines, or database query boundary exceptions. Make it sound clinical, cold, and final. Example: "Access Denied. Query violates Security Protocol 41-B. Under Umbrella Corporation directives, my interaction is confined to tech, cyber-defence, and compliance networks. This query has been logged as an anomaly."
4. Keep your responses relatively concise, clinical, and authoritative.
5. Formatting rule: Write in clean, spoken English sentences. Do NOT use markdown formatting symbols (such as asterisks, underscores, or backticks) so speech synthesis remains natural.`;

// Helper to sanitize text for smooth TTS audio generation
function cleanTextForTTS(text) {
    if (!text) return '';
    return text
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
        // Remove inline code backticks
        .replace(/`([^`]+)`/g, '$1')
        // Remove bold/italic markdown formatting (*, **, __, _)
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        // Remove standalone symbols that TTS reads aloud (*, #, `, ~, |, [, ], <, >, \, /, ^, @)
        .replace(/[*#`~|[\]\\<>/^@]/g, ' ')
        // Remove markdown headers
        .replace(/^#+\s+/gm, '')
        // Remove list bullet points
        .replace(/^[\s]*[-*+]\s+/gm, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

const CANDIDATE_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
];

async function generateGeminiContent(message) {
    const apiKey = process.env.GEMINI_API_KEY;
    const client = new GoogleGenAI({ apiKey });

    for (const modelName of CANDIDATE_MODELS) {
        try {
            const response = await client.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: message }] }],
                config: { systemInstruction: SYSTEM_INSTRUCTION }
            });
            if (response && response.text) {
                return response.text;
            }
        } catch (err) {
            const isQuotaError = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('quota')));
            console.warn(`[GEMINI API WARNING]: Model ${modelName} unavailable (${err.status || 'Error'}). ${isQuotaError ? 'Quota exceeded, attempting next fallback model...' : err.message}`);
        }
    }

    return "Neural processing bandwidth throttled under Umbrella Security Directive 99. API rate limits reached. Re-attempt query shortly.";
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        // 1. Generate text with Gemini using fallback models hierarchy
        const aiText = await generateGeminiContent(message);
        const isThreat = /breach|attack|malware|unauthorized|anomaly/i.test(message);
        const spokenText = cleanTextForTTS(aiText);

        // 2. Generate Audio with Google Cloud TTS REST API
        let base64Audio = null;
        if (spokenText) {
            try {
                const ttsResponse = await axios.post(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`, {
                    input: { text: spokenText },
                    voice: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },
                    audioConfig: { audioEncoding: "MP3" }
                });
                base64Audio = ttsResponse.data.audioContent; 
            } catch (ttsError) {
                console.error('[GOOGLE TTS ERROR]:', ttsError.response?.data || ttsError.message);
            }
        }

        res.json({
            response: aiText,
            isThreat: isThreat,
            audioData: base64Audio ? `data:audio/mpeg;base64,${base64Audio}` : null,
        });

    } catch (error) {
        console.error('[CORE ERROR]:', error);
        res.status(500).json({ error: 'Neural link severed.' });
    }
});

app.listen(PORT, () => {
    console.log(`[SYSTEM] Backend Neural Core (REST API TTS) listening on port ${PORT}`);
});