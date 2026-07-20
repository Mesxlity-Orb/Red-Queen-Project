import React, { useEffect, useRef, useState } from 'react';
import { getFaceDescriptor } from '../utils/faceDescriptor';
import { apiFetch, pingBackend } from '../utils/apiConfig';
import RedQueenAvatar, { AvatarMode } from './RedQueenAvatar';

interface LoginScreenProps {
  onAuthorized: (name: string, role: string) => void;
}

export default function LoginScreen({ onAuthorized }: LoginScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete' | 'failed' | 'lockout'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [statusMsg, setStatusMsg] = useState('ALIGN FACE WITH SCANNER');
  const [cameraAllowed, setCameraAllowed] = useState(false);

  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const latestLandmarksRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  // Ping backend on mount to wake Render from sleep before any real request
  useEffect(() => { pingBackend(); }, []);

  // Check if already in lockdown on mount
  useEffect(() => {
    const expiry = localStorage.getItem('red_queen_lockdown_expiry');
    if (expiry) {
      const remaining = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setScanState('lockout');
        setLockoutTimeLeft(remaining);
        setAttempts(3);
        startAlarmSound();
      } else {
        localStorage.removeItem('red_queen_lockdown_expiry');
      }
    }
  }, []);

  // Lockdown timer countdown
  useEffect(() => {
    if (scanState !== 'lockout') {
      stopAlarmSound();
      return;
    }

    const timer = setInterval(() => {
      const expiry = localStorage.getItem('red_queen_lockdown_expiry');
      if (expiry) {
        const remaining = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutTimeLeft(remaining);
        } else {
          localStorage.removeItem('red_queen_lockdown_expiry');
          setScanState('idle');
          setAttempts(0);
          setScanProgress(0);
          setStatusMsg('SYSTEM READY. RETRY BIOMETRIC AUTHENTICATION.');
          stopAlarmSound();
        }
      } else {
        setScanState('idle');
        setAttempts(0);
        setScanProgress(0);
        setStatusMsg('SYSTEM READY. RETRY BIOMETRIC AUTHENTICATION.');
        stopAlarmSound();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      stopAlarmSound();
    };
  }, [scanState]);

  // Synthesis-based siren sound for lockdown (Web Audio API)
  const startAlarmSound = () => {
    try {
      if (audioContextRef.current) return;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      let isHigh = false;
      alarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        // Alternating siren frequencies
        osc.frequency.setValueAtTime(isHigh ? 880 : 440, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime); // keep volume low
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
        isHigh = !isHigh;
      }, 500);
    } catch (e) {
      console.error('Audio alarm failed to start:', e);
    }
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Initialize camera and MediaPipe
  useEffect(() => {
    if (scanState === 'lockout') return;

    let activeStream: MediaStream | null = null;
    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass = (window as any).Camera;

    if (!FaceMeshClass || !CameraClass) {
      setStatusMsg('SYSTEM ERROR: BIOMETRIC ASSETS UNRESOLVED');
      return;
    }

    async function startBiometrics() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        activeStream = mediaStream;
        // Save stream in ref FIRST so the useEffect below can access it synchronously
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraAllowed(true);
        // Changing scanState triggers a re-render that mounts the video element,
        // THEN the useEffect keyed on [scanState] will safely assign srcObject
        setScanState('scanning');
        setStatusMsg('INITIALIZING NEURAL LINK...');

      } catch (err) {
        console.error('Camera biometrics start failed:', err);
        setScanState('failed');
        setStatusMsg('BIOMETRIC HARDWARE OFFLINE');
      }
    }

    startBiometrics();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [scanState === 'lockout']);

  // Deferred FaceMesh + srcObject init — runs AFTER the video element is mounted
  useEffect(() => {
    if (scanState !== 'scanning') return;
    const mediaStream = streamRef.current;
    if (!mediaStream) return;
    if (!videoRef.current) return;

    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass = (window as any).Camera;
    if (!FaceMeshClass || !CameraClass) {
      setStatusMsg('SYSTEM ERROR: BIOMETRIC ASSETS UNRESOLVED');
      return;
    }

    // Safely assign stream now that the video element is in the DOM
    videoRef.current.srcObject = mediaStream;

    // Setup Face Mesh
    const fm = new FaceMeshClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    fm.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    fm.onResults((results: any) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        latestLandmarksRef.current = results.multiFaceLandmarks[0];
      } else {
        latestLandmarksRef.current = null;
      }
    });

    faceMeshRef.current = fm;

    // Setup Camera Loop
    const cam = new CameraClass(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await fm.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    cam.start();
    cameraRef.current = cam;
  }, [scanState]);

  // Scan progress simulation
  useEffect(() => {
    if (scanState !== 'scanning') return;

    let progress = 0;
    const interval = setInterval(() => {
      if (!latestLandmarksRef.current) {
        setStatusMsg('AWAITING BIO-SIGNATURE...');
        return;
      }

      progress += 2;
      setScanProgress(progress);

      if (progress >= 20 && progress < 50) {
        setStatusMsg('MAPPING FACIAL GEOMETRY...');
      } else if (progress >= 50 && progress < 80) {
        setStatusMsg('ANALYZING KEY NODES...');
      } else if (progress >= 80 && progress < 100) {
        setStatusMsg('RESOLVING RED QUEEN DATABASE...');
      }

      if (progress >= 100) {
        clearInterval(interval);
        setScanState('complete');
        verifyIdentity();
      }
    }, 60);

    return () => clearInterval(interval);
  }, [scanState]);

  // Submit facial geometry descriptor to backend
  const verifyIdentity = async () => {
    if (!latestLandmarksRef.current) {
      // Retrying if face lost at final moment
      setScanState('scanning');
      setScanProgress(0);
      return;
    }

    setStatusMsg('COMPARING DESCRIPTOR...');
    
    // Normalize latest landmarks to stable 128-float vector
    const descriptor = getFaceDescriptor(latestLandmarksRef.current);

    let attemptsCount = 0;
    const maxRetries = 3;
    
    while (attemptsCount < maxRetries) {
      try {
        if (attemptsCount > 0) {
          setStatusMsg(`WAKING NEURAL CORE... RETRY (${attemptsCount}/${maxRetries})`);
        }

        const res = await apiFetch('/api/biometrics/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor })
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.identified) {
          const verifiedName = data.name || 'Operator';
          setStatusMsg(`IDENTITY VERIFIED: WELCOME ${verifiedName.toUpperCase()}`);
          setScanState('complete');
          
          // Play synthetic entry chime
          playAccessChime();

          setTimeout(() => {
            onAuthorized(verifiedName, data.role || 'Security Officer');
          }, 1500);
        } else {
          const nextAttempts = attempts + 1;
          setAttempts(nextAttempts);
          
          if (nextAttempts >= 3) {
            // Trigger Lockdown
            const lockoutPeriod = 60; // 60 seconds
            const expiryTime = Date.now() + lockoutPeriod * 1000;
            localStorage.setItem('red_queen_lockdown_expiry', expiryTime.toString());
            setScanState('lockout');
            setLockoutTimeLeft(lockoutPeriod);
            setStatusMsg('LOCKDOWN INITIATED: INTRUDER BLOCK');
            startAlarmSound();
          } else {
            setScanState('failed');
            setStatusMsg(`BIO-MATCH FAIL: ACCESS DENIED (${3 - nextAttempts} ATTEMPTS REMAINING)`);
          }
        }
        return; // Success, exit retry loop

      } catch (e) {
        console.warn(`[BIOMETRICS API RETRY ${attemptsCount + 1}]:`, e);
        attemptsCount++;
        if (attemptsCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } else {
          setScanState('failed');
          setStatusMsg('API COMMUNICATION ERROR (CHECK SERVER LINK)');
        }
      }
    }
  };

  const playAccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      osc1.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6

      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (err) {}
  };

  // Canvas HUD overlay drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let scanLineY = 0;
    let angle = 0;

    const drawHUD = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Lockout overlay
      if (scanState === 'lockout') {
        // Red flashing background
        const flash = Math.sin(Date.now() / 150) > 0;
        ctx.fillStyle = flash ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, w, h);

        // Tech borders
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, w - 20, h - 20);

        // Flashing Warning Text
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 20px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRITICAL LOCKDOWN', w / 2, h / 2 - 30);

        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('INTRUSION DETECTED - SECURITY SHIELD ACTIVE', w / 2, h / 2 - 5);
        ctx.fillText('SAFEHOLD DEPLOYED FROM HOSTILE HACKING', w / 2, h / 2 + 15);

        ctx.font = 'bold 28px "Orbitron", sans-serif';
        ctx.fillText(`00:${lockoutTimeLeft.toString().padStart(2, '0')}`, w / 2, h / 2 + 55);

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 51, 51, 0.5)';
        ctx.fillText('SYS.THREAT.LOGGED // OVERRIDE DISABLED', w / 2, h - 30);
      } else {
        // Normal Camera HUD
        const boxSize = 180;
        const boxX = (w - boxSize) / 2;
        const boxY = (h - boxSize) / 2;
        const color = scanState === 'failed' ? '#ff3333' : scanState === 'complete' ? '#00f0ff' : '#ff3333';

        // Draw bracket corners
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + 30);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + 30, boxY);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(boxX + boxSize - 30, boxY);
        ctx.lineTo(boxX + boxSize, boxY);
        ctx.lineTo(boxX + boxSize, boxY + 30);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxSize - 30);
        ctx.lineTo(boxX, boxY + boxSize);
        ctx.lineTo(boxX + 30, boxY + boxSize);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(boxX + boxSize - 30, boxY + boxSize);
        ctx.lineTo(boxX + boxSize, boxY + boxSize);
        ctx.lineTo(boxX + boxSize, boxY + boxSize - 30);
        ctx.stroke();

        // Rotating telemetry ring
        angle += 0.015;
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, boxSize / 2 + 30, angle, angle + 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        // Scanning grid
        if (scanState === 'scanning' && latestLandmarksRef.current) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.03)';
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          // Moving scanner line
          scanLineY = boxY + ((Math.sin(Date.now() / 150) + 1) / 2) * boxSize;
          ctx.strokeStyle = 'rgba(255, 51, 51, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(boxX, scanLineY);
          ctx.lineTo(boxX + boxSize, scanLineY);
          ctx.stroke();

          // Draw tracked face landmark dots in canvas (Cyan to represent alignment)
          ctx.fillStyle = '#00f0ff';
          // Draw a subset of landmarks to show tracking is live!
          const landmarks = latestLandmarksRef.current;
          const drawIndices = [1, 33, 133, 362, 263, 61, 291, 10, 152];
          for (const idx of drawIndices) {
            const pt = landmarks[idx];
            if (pt) {
              const xProj = pt.x * w;
              const yProj = pt.y * h;
              ctx.beginPath();
              ctx.arc(xProj, yProj, 2.5, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }

        // Print Status / Progress
        ctx.fillStyle = color;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        if (scanState === 'scanning') {
          ctx.fillText(`BIOMETRIC ALIGNMENT: ${scanProgress}%`, w / 2, boxY - 15);
        } else {
          ctx.fillText(statusMsg, w / 2, boxY - 15);
        }

        // Telemetry details
        ctx.fillStyle = 'rgba(255, 51, 51, 0.4)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`NODE.SECURE // ATTEMPTS: ${attempts}/3`, 15, h - 15);
        ctx.textAlign = 'right';
        ctx.fillText(`RATE: 60Hz // CAM_ON`, w - 15, h - 15);
      }

      animId = requestAnimationFrame(drawHUD);
    };

    drawHUD();
    return () => cancelAnimationFrame(animId);
  }, [scanState, scanProgress, statusMsg, lockoutTimeLeft, attempts]);

  const handleRetry = () => {
    if (scanState === 'lockout') return;
    setScanProgress(0);
    setScanState('scanning');
    setStatusMsg('RE-INITIATING BIOMETRICS...');
  };

  return (
    <div className="w-full max-w-lg border border-red-900/60 bg-black/90 p-6 rounded-lg shadow-[0_0_50px_rgba(255,0,0,0.2)] crt-overlay">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-wider glitch-text text-red-500 font-mono">
          THE RED QUEEN
        </h1>
        <p className="text-[10px] text-red-600/70 tracking-[0.2em] font-mono mt-1">
          NEURAL MATRIX OVERRIDE INTERFACE
        </p>
      </div>

      <div className="relative w-full h-[280px] bg-black border border-red-950 rounded overflow-hidden">
        {/* Avatar video behind the scanner: shown only in lockdown or failed states */}
        {(scanState === 'lockout' || scanState === 'failed') && (
          <div className="absolute inset-0 z-0">
            <RedQueenAvatar
              mode={scanState === 'lockout' ? 'lockdown' : 'anxious'}
              showHUD={false}
            />
          </div>
        )}

        {/* User camera feed — always mounted to keep videoRef valid */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 z-10 ${
            scanState === 'lockout'
              ? 'opacity-0'
              : scanState === 'failed'
              ? 'grayscale brightness-50 contrast-125 opacity-60'
              : 'grayscale brightness-90 contrast-125 opacity-100'
          }`}
        />

        <canvas
          ref={canvasRef}
          width={440}
          height={280}
          className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        />

        {!cameraAllowed && scanState !== 'lockout' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 text-center z-30">
            <span className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-red-500 text-xs font-mono mb-2">[ CAMERA SYNC STANDBY ]</div>
            <div className="text-[10px] text-gray-500 max-w-[280px]">
              Confirm browser camera access permissions when prompted.
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="bg-red-950/20 border border-red-900/40 p-3 rounded font-mono text-[10px] text-red-400">
          <div className="flex justify-between font-bold border-b border-red-950 pb-1 mb-1">
            <span>CORE NODE ENCRYPTION</span>
            <span>RSA-4096</span>
          </div>
          <div>STATUS: <span className={scanState === 'lockout' ? 'text-red-500 font-bold animate-pulse' : 'text-cyan-400'}>{statusMsg}</span></div>
          {scanState !== 'lockout' && <div>SECURITY LOCK: SHA-256 IDENTIFIER REQUIRED</div>}
        </div>

        {scanState === 'failed' && (
          <button
            onClick={handleRetry}
            className="system-btn w-full p-2.5 font-bold font-mono text-xs tracking-wider uppercase rounded"
          >
            Attempt Re-scan
          </button>
        )}

        <div className="flex justify-between items-center text-[9px] text-red-700/60 font-mono mt-1">
          <span>UMBRELLA CORP // SECURE LINK</span>
          <span className="text-red-900/40">SYS.ENCRYPTED.CHANNEL</span>
        </div>
        <div className="text-center text-[9px] text-red-600/70 font-mono mt-2 pt-2 border-t border-red-950/60">
          © 2026 MesxlitySolutions (Rabih Rizkallah). All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
