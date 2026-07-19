/**
 * RedQueenAvatar.tsx
 * ──────────────────
 * Video-driven hologram component using Red Queen video library:
 *
 * ALL TTS Speech responses (chat terminal & live cam) use the 3-Stage Synchronized Sequence:
 *   1. /hologram/TalkingNormaly - Start.mp4       (Plays at TTS speech onset)
 *   2. /hologram/TalkingNormaly - Continious.mp4  (Loops during middle of TTS speech)
 *   3. /hologram/TalkingNormaly - End.mp4         (Plays during final ~1.2s of TTS speech)
 *
 * Other Modes:
 *   - 'idle': Pauses at frame 0 so mouth is closed/neutral when silent.
 *   - 'thinking': /hologram/Typing.mp4 (Loops while computing response)
 *   - 'lockdown': /hologram/TalkingAngerly.mp4 (Biometric lockout screen)
 */
import React, { useEffect, useRef, useState } from 'react';

export type AvatarMode = 'idle' | 'thinking' | 'speaking' | 'threat' | 'lockdown' | 'anxious';

interface RedQueenAvatarProps {
  mode?: AvatarMode;
  isSpeaking?: boolean;
  threatActive?: boolean;
  fullscreen?: boolean;
  showHUD?: boolean;
}

const START_SRC = '/hologram/TalkingNormaly - Start.mp4';
const CONT_SRC  = '/hologram/TalkingNormaly - Continious.mp4';
const END_SRC   = '/hologram/TalkingNormaly - End.mp4';

const VIDEO_SRC: Record<AvatarMode, string> = {
  idle:     START_SRC,
  speaking: START_SRC,
  thinking: '/hologram/Typing.mp4',
  anxious:  START_SRC,
  threat:   START_SRC,
  lockdown: '/hologram/TalkingAngerly.mp4',
};

const MODE_META: Record<AvatarMode, { label: string; color: string; pulse: boolean }> = {
  idle:     { label: 'NEURAL CORE: STANDBY',        color: 'text-red-500/70',  pulse: false },
  speaking: { label: 'TRANSMITTING — VOICE SYNTH',  color: 'text-red-400',     pulse: false },
  thinking: { label: 'COMPUTING RESPONSE...',        color: 'text-cyan-400',    pulse: true  },
  anxious:  { label: 'REQUEST REFUSED',              color: 'text-yellow-400',  pulse: true  },
  threat:   { label: '⚠ HOSTILE ANOMALY DETECTED',   color: 'text-red-500',     pulse: true  },
  lockdown: { label: '🔒 SYSTEM LOCKDOWN ACTIVE',    color: 'text-red-600',     pulse: true  },
};

const MODE_OVERLAY: Record<AvatarMode, string> = {
  idle:     'bg-blue-950/10',
  speaking: 'bg-blue-950/10',
  thinking: 'bg-cyan-950/20',
  anxious:  'bg-yellow-950/15',
  threat:   'bg-red-950/30',
  lockdown: 'bg-red-950/50',
};

function resolveMode(mode?: AvatarMode, isSpeaking?: boolean, threatActive?: boolean): AvatarMode {
  if (threatActive) return 'threat';
  if (isSpeaking)  return 'speaking';
  return mode ?? 'idle';
}

export default function RedQueenAvatar({
  mode,
  isSpeaking = false,
  threatActive = false,
  fullscreen = false,
  showHUD = true,
}: RedQueenAvatarProps) {
  const effectiveMode = resolveMode(mode, isSpeaking, threatActive);
  const [speechPhase, setSpeechPhase] = useState<'start' | 'continuous' | 'end'>('start');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if current mode is TTS speech output
  const isTtsMode = effectiveMode === 'speaking' || effectiveMode === 'threat' || effectiveMode === 'anxious';

  // Compute active video src: TTS speech ALWAYS uses 3-stage sequence
  const speechSrc = speechPhase === 'start' ? START_SRC : speechPhase === 'end' ? END_SRC : CONT_SRC;
  const activeSrc = isTtsMode ? speechSrc : VIDEO_SRC[effectiveMode];

  const meta = MODE_META[effectiveMode];
  const overlay = MODE_OVERLAY[effectiveMode];

  // Reset speech phase to 'start' whenever entering TTS speech mode
  useEffect(() => {
    if (isTtsMode) {
      setSpeechPhase('start');
    }
  }, [isTtsMode]);

  // Manage video playback and src changes cleanly on a stable DOM node
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (effectiveMode === 'idle') {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [effectiveMode, activeSrc]);

  // Handle 3-stage TTS speech sequence (Start -> Continuous -> End)
  useEffect(() => {
    if (!isTtsMode) return;

    const audio = (window as any).redQueenAudio as HTMLAudioElement | undefined;
    const video = videoRef.current;

    const handleVideoEnded = () => {
      if (speechPhase === 'start') {
        setSpeechPhase('continuous');
      }
    };

    const handleAudioTimeUpdate = () => {
      if (!audio || !audio.duration || isNaN(audio.duration)) return;
      const remaining = audio.duration - audio.currentTime;
      // Trigger closing gesture (~1.2s before TTS audio finishes)
      if (remaining <= 1.2 && speechPhase !== 'end') {
        setSpeechPhase('end');
      }
    };

    const handleAudioEnded = () => {
      if (speechPhase !== 'end') {
        setSpeechPhase('end');
      }
    };

    if (video) {
      video.addEventListener('ended', handleVideoEnded);
    }

    if (audio) {
      audio.addEventListener('timeupdate', handleAudioTimeUpdate);
      audio.addEventListener('ended', handleAudioEnded);
    }

    return () => {
      if (video) video.removeEventListener('ended', handleVideoEnded);
      if (audio) {
        audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
        audio.removeEventListener('ended', handleAudioEnded);
      }
    };
  }, [isTtsMode, speechPhase]);

  // HUD scan-line animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!showHUD) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let scanY = 0;
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      scanY = (scanY + 1.5) % h;
      const scanColor = effectiveMode === 'threat' || effectiveMode === 'lockdown'
        ? 'rgba(255, 30, 30, 0.18)'
        : effectiveMode === 'thinking'
        ? 'rgba(0, 220, 255, 0.15)'
        : 'rgba(255, 60, 60, 0.12)';

      ctx.strokeStyle = scanColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      const bracketColor = effectiveMode === 'thinking' ? 'rgba(0, 220, 255, 0.5)'
        : effectiveMode === 'threat' || effectiveMode === 'lockdown' ? 'rgba(255, 30, 30, 0.7)'
        : 'rgba(255, 60, 60, 0.35)';

      ctx.strokeStyle = bracketColor;
      ctx.lineWidth = 2;
      const bx = 12, by = 12, blen = 24;

      // Top Left Corner
      ctx.beginPath(); ctx.moveTo(bx, by + blen); ctx.lineTo(bx, by); ctx.lineTo(bx + blen, by); ctx.stroke();
      // Top Right Corner
      ctx.beginPath(); ctx.moveTo(w - bx - blen, by); ctx.lineTo(w - bx, by); ctx.lineTo(w - bx, by + blen); ctx.stroke();
      // Bottom Left Corner
      ctx.beginPath(); ctx.moveTo(bx, h - by - blen); ctx.lineTo(bx, h - by); ctx.lineTo(bx + blen, h - by); ctx.stroke();
      // Bottom Right Corner
      ctx.beginPath(); ctx.moveTo(w - bx - blen, h - by); ctx.lineTo(w - bx, h - by); ctx.lineTo(w - bx, h - by - blen); ctx.stroke();

      angle += 0.008;
      ctx.strokeStyle = bracketColor.replace('0.35', '0.12').replace('0.7', '0.2').replace('0.5', '0.15');
      ctx.lineWidth = 0.8;
      ctx.setLineDash([5, 18]);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 20, angle, angle + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (effectiveMode === 'lockdown') {
        const flash = Math.sin(Date.now() / 180) > 0;
        if (flash) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
          ctx.fillRect(0, 0, w, h);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [showHUD, effectiveMode]);

  const isLooping = effectiveMode === 'thinking' ||
    effectiveMode === 'lockdown' ||
    (isTtsMode && speechPhase === 'continuous');

  return (
    <div className={`relative ${fullscreen ? 'w-full h-full' : 'w-full h-full'} bg-black overflow-hidden flex flex-col`}>

      {/* Stable DOM node video element */}
      <video
        ref={videoRef}
        src={activeSrc}
        autoPlay
        muted
        playsInline
        loop={isLooping}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'brightness(0.88) contrast(1.1) saturate(1.1)',
        }}
      />

      {/* Holographic overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-700 ${overlay}`}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* HUD overlay */}
      {showHUD && (
        <canvas
          ref={canvasRef}
          width={fullscreen ? 960 : 480}
          height={fullscreen ? 640 : 320}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />
      )}

      {/* Status Label */}
      {showHUD && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-3 flex flex-col items-center pointer-events-none">
          <span
            className={`font-mono font-bold tracking-[0.18em] uppercase ${meta.color} ${
              meta.pulse ? 'animate-pulse' : ''
            } ${fullscreen ? 'text-sm' : 'text-[9px]'}`}
          >
            {meta.label}
          </span>
          {fullscreen && (
            <span className="text-[9px] text-red-900/60 tracking-widest mt-0.5 uppercase font-mono">
              Red Queen // Umbrella Corp Neural Interface
            </span>
          )}
        </div>
      )}

      {/* Mode badge */}
      {showHUD && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <span
            className={`font-mono text-[8px] border px-1.5 py-0.5 rounded uppercase tracking-wider ${
              effectiveMode === 'lockdown' || effectiveMode === 'threat'
                ? 'border-red-700 text-red-500 bg-red-950/40'
                : effectiveMode === 'thinking'
                ? 'border-cyan-700 text-cyan-400 bg-cyan-950/40'
                : effectiveMode === 'anxious'
                ? 'border-yellow-700 text-yellow-400 bg-yellow-950/30'
                : 'border-red-900/40 text-red-700 bg-black/40'
            }`}
          >
            {effectiveMode.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
