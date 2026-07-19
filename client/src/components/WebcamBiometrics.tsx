import React, { useEffect, useRef, useState } from 'react';

interface WebcamBiometricsProps {
  onAuthorized: (name: string) => void;
  onNeedRegistration: (descriptor: number[]) => void;
  onSystemMessage: (sender: string, text: string) => void;
  authorized: boolean;
  userName: string | null;
}

export default function WebcamBiometrics({
  onAuthorized,
  onNeedRegistration,
  onSystemMessage,
  authorized,
  userName,
}: WebcamBiometricsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle');
  const [cameraAllowed, setCameraAllowed] = useState(false);

  // Initialize camera stream
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });

        // If component unmounted while awaiting, stop the stream immediately
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraAllowed(true);
        setScanState('scanning');
        onSystemMessage('SYSTEM', 'Camera link established. Initiating biometric scan...');
      } catch (err) {
        if (cancelled) return;
        console.error('Camera access failed:', err);
        setScanState('error');
        onSystemMessage('ERROR', 'Webcam link failed. Biometric scanner offline.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Wire the stream to the video element once both are available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Biometric scanning simulation timer
  useEffect(() => {
    if (scanState !== 'scanning') return;

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanState('complete');
          performIdentification();
          return 100;
        }
        
        // Log checkpoints
        if (prev === 25) {
          onSystemMessage('SYSTEM', 'Grid mapping: 25% - Analysing facial layout...');
        } else if (prev === 55) {
          onSystemMessage('SYSTEM', 'Neural link: 55% - Accessing Red Queen memory bank...');
        } else if (prev === 85) {
          onSystemMessage('SYSTEM', 'Biometrics: 85% - Comparing descriptors...');
        }
        
        return prev + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [scanState]);

  // Canvas overlays and targeting boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotationAngle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw scanner box in center
      const boxSize = 160;
      const boxX = (w - boxSize) / 2;
      const boxY = (h - boxSize) / 2;

      // Scanning overlay color (Red if unauthorized/threat, Cyan if authorized/clean)
      const color = authorized ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 51, 51, 0.8)';
      const fillLight = authorized ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255, 51, 51, 0.05)';

      // 1. Draw corner brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      // Top Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + 20);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + 20, boxY);
      ctx.stroke();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxSize - 20, boxY);
      ctx.lineTo(boxX + boxSize, boxY);
      ctx.lineTo(boxX + boxSize, boxY + 20);
      ctx.stroke();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxSize - 20);
      ctx.lineTo(boxX, boxY + boxSize);
      ctx.lineTo(boxX + 20, boxY + boxSize);
      ctx.stroke();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxSize - 20, boxY + boxSize);
      ctx.lineTo(boxX + boxSize, boxY + boxSize);
      ctx.lineTo(boxX + boxSize, boxY + boxSize - 20);
      ctx.stroke();

      // 2. Draw moving target lines or grids inside the box
      if (scanState === 'scanning') {
        ctx.fillStyle = fillLight;
        ctx.fillRect(boxX, boxY, boxSize, boxSize);

        // Moving scan horizontal line
        const lineY = boxY + ((Math.sin(Date.now() / 200) + 1) / 2) * boxSize;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.5)';
        ctx.moveTo(boxX, lineY);
        ctx.lineTo(boxX + boxSize, lineY);
        ctx.stroke();

        // Crosshairs in the middle of box
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.2)';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 20, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // 3. Rotating telemetry rings outside scanner box
      rotationAngle += 0.01;
      ctx.strokeStyle = authorized ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 51, 51, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 120, rotationAngle, rotationAngle + 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 4. Print Status Text on Canvas
      ctx.fillStyle = color;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      
      if (scanState === 'scanning') {
        ctx.fillText(`BIOMETRIC LOCK: ${scanProgress}%`, w / 2, boxY - 15);
      } else if (scanState === 'complete') {
        ctx.fillText(authorized ? 'IDENTITY VERIFIED' : 'ACCESS PENDING', w / 2, boxY - 15);
      } else if (scanState === 'error') {
        ctx.fillText('SCANNER FAULT', w / 2, boxY - 15);
      }

      // Add small tech details
      ctx.textAlign = 'left';
      ctx.fillStyle = authorized ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 51, 51, 0.4)';
      ctx.fillText('SYS.NODE: L-QUEEN-01', 10, h - 10);
      ctx.textAlign = 'right';
      ctx.fillText(`FPS: 60.0`, w - 10, h - 10);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [scanState, scanProgress, authorized]);

  // Request identification from backend
  const performIdentification = async () => {
    try {
      // Mock descriptor representing the user's face (length 128 as expected by face-api)
      const mockDescriptor = Array.from({ length: 128 }, () => Math.random());

      const res = await fetch('/api/biometrics/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: mockDescriptor }),
      });
      const data = await res.json();

      if (data.identified) {
        onAuthorized(data.name);
      } else {
        // Trigger register state, pass mock descriptor for registration
        onNeedRegistration(mockDescriptor);
      }
    } catch (err) {
      console.error('[IDENTIFY API ERROR]:', err);
      onSystemMessage('ERROR', 'Identity validation server offline. Access denied.');
    }
  };

  return (
    <div className="w-full h-full relative bg-black flex flex-col items-center justify-center border border-red-900/40 rounded overflow-hidden">
      {/* Video stream */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover absolute inset-0 ${
          authorized ? 'brightness-50 contrast-125' : 'grayscale brightness-75 contrast-125'
        }`}
      />

      {/* Canvas for hud overlays */}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Futuristic Scanline */}
      {scanState === 'scanning' && <div className="scan-line" />}

      {/* Overlay Status Bar */}
      <div className="absolute top-2 left-2 z-20 bg-black/70 border border-red-900/50 px-2 py-1 text-[9px] tracking-wider text-red-500/80 font-mono flex items-center gap-1.5 rounded">
        <span className={`w-1.5 h-1.5 rounded-full ${scanState === 'scanning' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        {scanState === 'scanning' ? 'ANALYZING' : scanState === 'complete' ? 'READY' : 'OFFLINE'}
      </div>

      {/* Status Panel for Non-Video States */}
      {!cameraAllowed && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-20">
          <div className="text-red-500 text-xs font-mono mb-2 border border-red-900 p-2 animate-pulse bg-red-950/20">
            [ BIOMETRICS NODE STANDBY ]
          </div>
          <div className="text-[10px] text-gray-500">
            Awaiting camera initialization...
          </div>
        </div>
      )}
    </div>
  );
}