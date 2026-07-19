import React, { useEffect, useRef, useState, useCallback } from 'react';
import RedQueenAvatar, { AvatarMode } from './RedQueenAvatar';

interface LiveCamDebaterProps {
  onBack: () => void;
  userName: string;
}

type CaptionEntry = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
};

const REFUSAL_RX = [
  /cannot/i, /won't/i, /unable/i, /refuse/i, /unauthorized/i,
  /restrict/i, /denied/i, /not allowed/i, /prohibited/i,
];
const isRefusal = (t: string) => REFUSAL_RX.some(rx => rx.test(t));

export default function LiveCamDebater({ onBack, userName = 'Security Officer' }: LiveCamDebaterProps) {
  const safeName = (userName || 'Security Officer').toUpperCase();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef   = useRef<any>(null);

  const recognitionRef           = useRef<any>(null);
  const silenceTimerRef          = useRef<any>(null);
  const accumulatedTextRef       = useRef('');
  const lastMouthActivityRef     = useRef(0);
  const isMouthMovingRef         = useRef(false);
  const baselineRestingRef       = useRef(0.018);
  const consecutiveMovingFramesRef = useRef(0);
  const botSpeechStartTimeRef    = useRef(0);

  const [captions, setCaptions]     = useState<CaptionEntry[]>([]);
  const [vadStatus, setVadStatus]   = useState('STANDBY');
  const [vadColor,  setVadColor]    = useState('bg-red-500');
  const [pipExpanded, setPipExpanded] = useState(false);

  const [avatarMode, setAvatarMode] = useState<AvatarMode>('idle');

  const SILENCE_DELAY         = 1800;
  const MOUTH_GRACE_PERIOD_MS = 1500;

  const stopBotAudio = useCallback(() => {
    const audio = (window as any).redQueenAudio as HTMLAudioElement | undefined;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    (window as any).redQueenIsSpeaking = false;
    setAvatarMode('idle');
  }, []);

  useEffect(() => {
    const handleSpeechStart = (e: Event) => {
      botSpeechStartTimeRef.current = Date.now();
      consecutiveMovingFramesRef.current = 0;

      const detail = (e as CustomEvent).detail || {};
      const { isThreat, responseText } = detail;
      if (isThreat) {
        setAvatarMode('threat');
      } else if (responseText && isRefusal(responseText)) {
        setAvatarMode('anxious');
      } else {
        setAvatarMode('speaking');
      }
    };

    const handleSpeechEnd = () => {
      setAvatarMode('idle');
    };

    window.addEventListener('redqueen-speech-start', handleSpeechStart);
    window.addEventListener('redqueen-speech-end', handleSpeechEnd);

    return () => {
      window.removeEventListener('redqueen-speech-start', handleSpeechStart);
      window.removeEventListener('redqueen-speech-end', handleSpeechEnd);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass   = (window as any).Camera;

    if (!FaceMeshClass || !CameraClass) {
      setVadStatus('LIBRARY ERROR');
      return;
    }

    async function init() {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { ms.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = ms;
        if (videoRef.current) videoRef.current.srcObject = ms;

        const fm = new FaceMeshClass({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        fm.onResults(onFaceResults);
        faceMeshRef.current = fm;

        const cam = new CameraClass(videoRef.current, {
          onFrame: async () => { if (videoRef.current) await fm.send({ image: videoRef.current }); },
          width: 640, height: 480,
        });
        cam.start();
        cameraRef.current = cam;
        startSpeechRecognition();
      } catch (err) {
        if (cancelled) return;
        setVadStatus('CAMERA ERROR');
      }
    }

    init();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      cameraRef.current?.stop();
      faceMeshRef.current?.close();
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); }
      clearTimeout(silenceTimerRef.current);
      stopBotAudio();
    };
  }, [stopBotAudio]);

  // Enhanced Multi-Point Adaptive Lip Detection Callback with Debounced Interruption
  const onFaceResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks?.length > 0) {
      const lm = results.multiFaceLandmarks[0];

      // Multi-point facial geometry: inner vertical, outer vertical, horizontal width & face scale
      const innerVert = Math.abs(lm[13].y - lm[14].y);
      const outerVert = (lm[0] && lm[17]) ? Math.abs(lm[0].y - lm[17].y) : innerVert;
      const faceH = Math.abs(lm[1].y - lm[152].y) || 1;

      // Inner vertical lip ratio
      const innerRatio = innerVert / faceH;
      const combinedRatio = (innerVert + outerVert * 0.4) / faceH;

      // Adapt resting baseline smoothly when user is likely silent
      if (combinedRatio < baselineRestingRef.current) {
        baselineRestingRef.current = combinedRatio;
      } else {
        baselineRestingRef.current += (combinedRatio - baselineRestingRef.current) * 0.001;
      }

      // Detection threshold: requires significant inner mouth opening
      const isMoving = (innerRatio > 0.026) || (combinedRatio - baselineRestingRef.current > 0.012);
      isMouthMovingRef.current = isMoving;

      if (isMoving) {
        consecutiveMovingFramesRef.current += 1;
        lastMouthActivityRef.current = Date.now();

        // Require sustained mouth movement (>= 12 frames ~400ms) & > 1.2s since bot started speaking to interrupt
        const audio = (window as any).redQueenAudio as HTMLAudioElement | undefined;
        const speechDuration = Date.now() - botSpeechStartTimeRef.current;

        if (audio && !audio.paused && speechDuration > 1200 && consecutiveMovingFramesRef.current >= 12) {
          stopBotAudio();
          addCaption('bot', '[INTERRUPTED BY USER]');
          consecutiveMovingFramesRef.current = 0;
        }
      } else {
        consecutiveMovingFramesRef.current = 0;
      }

      // Draw tracked lip nodes overlay
      ctx.fillStyle = isMoving ? '#00ff88' : '#ff3333';
      const drawIndices = [13, 14, 0, 17, 61, 291];
      for (const idx of drawIndices) {
        const pt = lm[idx];
        if (pt) {
          ctx.beginPath();
          ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (isMoving) {
        setVadStatus('SPEAKING');
        setVadColor('bg-green-500');
      } else {
        const grace = Date.now() - lastMouthActivityRef.current < MOUTH_GRACE_PERIOD_MS;
        setVadStatus(grace ? 'GRACE PERIOD' : 'SILENT');
        setVadColor(grace ? 'bg-yellow-500' : 'bg-red-500');
      }
    } else {
      isMouthMovingRef.current = false;
      consecutiveMovingFramesRef.current = 0;
      setVadStatus('NO FACE');
      setVadColor('bg-red-950 animate-pulse');
    }
    ctx.restore();
  };

  const startSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      const spoken = final || interim;

      if (spoken.trim().length > 0) {
        lastMouthActivityRef.current = Date.now();
        isMouthMovingRef.current = true;
      }

      const stale = Date.now() - lastMouthActivityRef.current > MOUTH_GRACE_PERIOD_MS && !isMouthMovingRef.current;
      if (stale || !spoken.trim()) return;

      accumulatedTextRef.current = spoken;
      updateLastCaption('user', spoken);
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (accumulatedTextRef.current.trim()) {
          triggerAI(accumulatedTextRef.current);
          accumulatedTextRef.current = '';
        }
      }, SILENCE_DELAY);
    };

    rec.onerror = (e: any) => console.warn('SR error:', e.error);
    rec.onend   = () => { try { rec.start(); } catch {} };
    rec.start();
    recognitionRef.current = rec;
  };

  const triggerAI = async (text: string) => {
    setAvatarMode('thinking');
    addCaption('bot', 'Processing vocal query...');

    try {
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      const data = await res.json();
      updateLastCaption('bot', data.response);

      if (data.audioData) {
        const audio = new Audio(data.audioData);
        (window as any).redQueenAudio = audio;

        audio.addEventListener('play', () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-start', {
            detail: { isThreat: data.isThreat, responseText: data.response }
          }));
        });
        audio.addEventListener('ended', () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        });
        audio.addEventListener('pause', () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        });
        audio.addEventListener('error', () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        });

        audio.play().catch(() => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        });
      } else {
        setAvatarMode('idle');
      }
    } catch (e) {
      updateLastCaption('bot', '[Neural link error: transmission failed]');
      setAvatarMode('idle');
    }
  };

  const addCaption = (sender: 'user' | 'bot', text: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setCaptions(prev => { const next = [...prev, { id, sender, text }]; if (next.length > 5) next.shift(); return next; });
  };
  const updateLastCaption = (sender: 'user' | 'bot', text: string) => {
    setCaptions(prev => {
      if (prev.length && prev[prev.length - 1].sender === sender) {
        const next = [...prev]; next[next.length - 1] = { ...next[next.length - 1], text }; return next;
      }
      const id = Math.random().toString(36).slice(2, 9);
      const next = [...prev, { id, sender, text }]; if (next.length > 5) next.shift(); return next;
    });
  };

  return (
    <div className="w-full h-full relative font-mono overflow-hidden bg-black">

      <div className="absolute inset-0 z-0">
        <RedQueenAvatar mode={avatarMode} fullscreen showHUD />
      </div>

      <div
        onClick={() => setPipExpanded(p => !p)}
        title={pipExpanded ? 'Minimize camera' : 'Expand camera'}
        className={`absolute z-30 bottom-6 right-6 rounded-2xl overflow-hidden border-2 shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all duration-300 cursor-pointer group ${
          pipExpanded ? 'w-72 h-52' : 'w-44 h-32'
        } ${vadColor.includes('green') ? 'border-green-500/70' : 'border-red-700/60'}`}
      >
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-cover scale-x-[-1] grayscale brightness-90 contrast-110"
        />
        <canvas
          ref={canvasRef}
          width={320} height={240}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none scale-x-[-1]"
        />
        <div className="absolute top-1.5 left-2 z-20 flex items-center gap-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[8px]">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vadColor} transition-colors`} />
          <span className="text-red-400 font-bold tracking-wide">{vadStatus}</span>
        </div>
        <div className="absolute bottom-1 right-2 z-20 text-[7px] text-red-700/50 group-hover:text-red-400 transition">
          {pipExpanded ? 'MINIMIZE ▲' : 'EXPAND ▼'}
        </div>
        <div className="absolute bottom-1 left-2 z-20 text-[7px] text-red-700/60 uppercase font-mono">
          {userName}
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start px-5 pt-4 pb-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div>
          <h2 className="font-bold text-red-500 text-sm flex items-center gap-2 tracking-wider glitch-text">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            VOCAL LIVE CAM — NEURAL LINK
          </h2>
          <div className="text-[9px] text-red-700/70 mt-0.5 uppercase">
            Subject: {safeName} | Lip-Sync VAD Active
          </div>
        </div>
        <div className="text-[10px] tracking-wider border border-red-900/60 bg-black/70 px-3 py-1 rounded pointer-events-auto flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            avatarMode === 'speaking' ? 'bg-red-500 animate-pulse' :
            avatarMode === 'thinking' ? 'bg-cyan-400 animate-pulse' :
            avatarMode === 'threat' || avatarMode === 'lockdown' ? 'bg-red-600 animate-ping' :
            avatarMode === 'anxious' ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-600'
          }`} />
          <span className={
            avatarMode === 'speaking'  ? 'text-red-400 font-bold' :
            avatarMode === 'thinking'  ? 'text-cyan-400 font-bold' :
            avatarMode === 'threat'    ? 'text-red-500 font-bold animate-pulse' :
            avatarMode === 'lockdown'  ? 'text-red-600 font-bold animate-pulse' :
            avatarMode === 'anxious'   ? 'text-yellow-400 font-bold' :
            'text-gray-400'
          }>
            {avatarMode === 'speaking'  ? 'TRANSMITTING' :
             avatarMode === 'thinking'  ? 'COMPUTING...' :
             avatarMode === 'threat'    ? 'THREAT ACTIVE' :
             avatarMode === 'lockdown'  ? 'LOCKDOWN' :
             avatarMode === 'anxious'   ? 'REQUEST REFUSED' :
             'AWAITING INPUT'}
          </span>
        </div>
      </div>

      <button
        onClick={onBack}
        className="absolute top-4 right-52 z-30 text-[10px] hover:text-white transition uppercase border border-red-900 px-3 py-1.5 rounded bg-red-950/30 hover:bg-red-900/50"
      >
        [ Exit Live Cam ]
      </button>

      <div className="absolute bottom-6 left-6 right-52 z-20 flex flex-col gap-2 max-h-[38%] overflow-y-auto pointer-events-none justify-end">
        {captions.map(cap => (
          <div key={cap.id} className={`flex ${cap.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl border text-[11px] md:text-xs leading-relaxed shadow-2xl backdrop-blur-sm ${
              cap.sender === 'user'
                ? 'bg-purple-950/85 border-purple-800/60 text-purple-100'
                : 'bg-red-950/85 border-red-800/60 text-red-100'
            }`}>
              <div className="text-[8px] font-bold opacity-50 uppercase mb-0.5">
                {cap.sender === 'user' ? userName : 'Red Queen'}
              </div>
              <div>{cap.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-center px-5 py-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
        <div className="text-[9px] text-red-900/50 tracking-widest">UMBRELLA CORP // SECURE NEURAL CHANNEL</div>
        <div className="text-[9px] text-red-900/50 tracking-widest">ENC: RSA-4096 // RATE: 60Hz</div>
      </div>

    </div>
  );
}
