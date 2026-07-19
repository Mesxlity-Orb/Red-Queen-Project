// Inside your Express route processing
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;

const ttsResponse = await fetch(ELEVENLABS_API_URL, {
  method: 'POST',
  headers: {
    'Accept': 'audio/mpeg',
    'xi-api-key': process.env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: geminiGeneratedText, // The response from your AI
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  })
});

const audioBuffer = await ttsResponse.arrayBuffer();
// Send this buffer back to the React frontend to play