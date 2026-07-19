import React, { useEffect, useRef } from 'react';

interface HologramProps {
  threatActive: boolean;
  isSpeaking?: boolean;
  fullscreen?: boolean;
}

// 41 vertices forming a 3D wireframe head (low-poly face structure)
const VERTICES = [
  // Face outer contour (0-11)
  { x: 0, y: 0.75, z: 0 },       // 0: Forehead top center
  { x: 0.35, y: 0.6, z: 0.2 },   // 1: Forehead left upper
  { x: -0.35, y: 0.6, z: 0.2 },  // 2: Forehead right upper
  { x: 0.55, y: 0.3, z: 0.3 },   // 3: Left temple
  { x: -0.55, y: 0.3, z: 0.3 },  // 4: Right temple
  { x: 0.6, y: -0.05, z: 0.4 },  // 5: Left cheek outer
  { x: -0.6, y: -0.05, z: 0.4 }, // 6: Right cheek outer
  { x: 0.5, y: -0.35, z: 0.3 },  // 7: Left jaw upper
  { x: -0.5, y: -0.35, z: 0.3 }, // 8: Right jaw upper
  { x: 0.3, y: -0.65, z: 0.25 }, // 9: Left jaw lower
  { x: -0.3, y: -0.65, z: 0.25 },// 10: Right jaw lower
  { x: 0, y: -0.85, z: 0.15 },   // 11: Chin bottom

  // Nose (12-16)
  { x: 0, y: 0.25, z: 0.5 },     // 12: Nose bridge top
  { x: 0, y: 0.05, z: 0.58 },    // 13: Nose bridge mid
  { x: 0, y: -0.15, z: 0.7 },    // 14: Nose tip
  { x: 0.12, y: -0.2, z: 0.55 }, // 15: Left nostril
  { x: -0.12, y: -0.2, z: 0.55 },// 16: Right nostril

  // Left Eye (17-21)
  { x: 0.18, y: 0.2, z: 0.45 },  // 17: Inner corner
  { x: 0.28, y: 0.26, z: 0.45 }, // 18: Upper lid
  { x: 0.38, y: 0.2, z: 0.45 },  // 19: Outer corner
  { x: 0.28, y: 0.14, z: 0.45 }, // 20: Lower lid
  { x: 0.28, y: 0.2, z: 0.48 },  // 21: Pupil

  // Right Eye (22-26)
  { x: -0.18, y: 0.2, z: 0.45 }, // 22: Inner corner
  { x: -0.28, y: 0.26, z: 0.45 },// 23: Upper lid
  { x: -0.38, y: 0.2, z: 0.45 }, // 24: Outer corner
  { x: -0.28, y: 0.14, z: 0.45 },// 25: Lower lid
  { x: -0.28, y: 0.2, z: 0.48 }, // 26: Pupil

  // Eyebrows (27-32)
  { x: 0.15, y: 0.34, z: 0.48 }, // 27: Left brow inner
  { x: 0.28, y: 0.36, z: 0.48 }, // 28: Left brow mid
  { x: 0.42, y: 0.32, z: 0.48 }, // 29: Left brow outer
  { x: -0.15, y: 0.34, z: 0.48 },// 30: Right brow inner
  { x: -0.28, y: 0.36, z: 0.48 },// 31: Right brow mid
  { x: -0.42, y: 0.32, z: 0.48 },// 32: Right brow outer

  // Lips (33-40)
  { x: 0, y: -0.32, z: 0.62 },   // 33: Upper lip center
  { x: 0.12, y: -0.34, z: 0.58 },// 34: Upper lip left
  { x: -0.12, y: -0.34, z: 0.58 },// 35: Upper lip right
  { x: 0, y: -0.42, z: 0.62 },   // 36: Lower lip center
  { x: 0.1, y: -0.4, z: 0.58 },  // 37: Lower lip left
  { x: -0.1, y: -0.4, z: 0.58 }, // 38: Lower lip right
  { x: 0.2, y: -0.36, z: 0.52 }, // 39: Left corner outer
  { x: -0.2, y: -0.36, z: 0.52 } // 40: Right corner outer
];

// Connecting lines mapping indices of VERTICES to draw the mesh
const CONNECTIONS = [
  // Outer Contour
  [0, 1], [1, 3], [3, 5], [5, 7], [7, 9], [9, 11],
  [0, 2], [2, 4], [4, 6], [6, 8], [8, 10], [10, 11],

  // Nose Ridge and Nostrils
  [12, 13], [13, 14], [14, 15], [14, 16], [15, 16],
  [12, 27], [12, 30], // nose top to brow inner

  // Left Eye Loop
  [17, 18], [18, 19], [19, 20], [20, 17],
  
  // Right Eye Loop
  [22, 23], [23, 24], [24, 25], [25, 22],

  // Brows
  [27, 28], [28, 29],
  [30, 31], [31, 32],

  // Upper Lip Loop
  [39, 34], [34, 33], [33, 35], [35, 40],

  // Lower Lip Loop
  [39, 37], [37, 36], [36, 38], [38, 40],

  // Inner connections forming face panels
  [0, 12],            // forehead to nose bridge
  [27, 17], [30, 22], // brows to eye inner corners
  [29, 19], [32, 24], // brows to eye outer corners
  [13, 17], [13, 22], // nose bridge to eye inner corners
  [14, 39], [14, 40], // nose tip to lip corners
  [14, 33],           // nose tip to upper lip center
  [15, 5], [16, 6],   // nostrils to cheeks
  [39, 7], [40, 8],   // mouth corners to jaw upper
  [36, 11],           // lower lip to chin bottom
  [9, 37], [10, 38]   // lower jaw to lower lip sides
];

export function Hologram({ threatActive, isSpeaking = false, fullscreen = false }: HologramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angleY = 0;
    let angleX = 0.15; // static default tilt
    let scanLineY = 0;

    // Helper for 3D rotation and perspective projection
    const project = (x: number, y: number, z: number, width: number, height: number, openAmount: number, isMouthNode: boolean, jitter: number) => {
      // 1. Apply mouth speaking animation if it is a mouth landmark
      let targetY = y;
      if (isMouthNode) {
        // lower lip nodes move down, upper lip nodes move up slightly
        if (isMouthNode && (y < -0.35)) {
          targetY = y - openAmount * 1.5;
        } else {
          targetY = y + openAmount * 0.4;
        }
      }

      // Add speech jitter / glitch
      const finalX = x + (Math.random() - 0.5) * jitter;
      const finalY = targetY + (Math.random() - 0.5) * jitter;
      const finalZ = z + (Math.random() - 0.5) * jitter;

      // 2. Rotate around Y-axis
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      let x1 = finalX * cosY - finalZ * sinY;
      let z1 = finalX * sinY + finalZ * cosY;

      // 3. Rotate around X-axis (tilt)
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      let y2 = finalY * cosX - z1 * sinX;
      let z2 = finalY * sinX + z1 * cosX;

      // 4. Perspective projection
      const dist = 2.4; // camera distance
      const scale = 140; // sizing factor
      const projX = (x1 * scale) / (z2 + dist) + width / 2;
      const projY = (-y2 * scale) / (z2 + dist) + height / 2; // invert y for canvas space

      return { x: projX, y: projY, z: z2 };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Background matrix grid effect
      ctx.strokeStyle = threatActive ? 'rgba(255, 0, 0, 0.03)' : 'rgba(255, 0, 0, 0.015)';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Rotate model
      if (isSpeaking) {
        // oscillate faster and slightly wider when talking
        angleY += 0.025;
        angleX = 0.1 + Math.sin(Date.now() / 180) * 0.05;
      } else {
        // calm, slow rotation when idle
        angleY += 0.008;
        angleX = 0.15 + Math.sin(Date.now() / 600) * 0.02;
      }

      // Glitch effect: occasionally shear/shift the canvas
      let shearX = 0;
      let isGlitchedFrame = false;
      if (isSpeaking && Math.random() < 0.06) {
        shearX = (Math.random() - 0.5) * 15;
        isGlitchedFrame = true;
      }

      // Hologram color profiles (Red matching the Red Queen)
      const primaryColor = threatActive ? '#ff1111' : '#ff3333';
      const secondaryColor = threatActive ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 51, 51, 0.1)';
      const nodeColor = '#ff6666';

      // Speaking mouth open oscillation
      const openAmount = isSpeaking ? (Math.sin(Date.now() / 65) + 1.0) * 0.045 : 0;
      const jitterAmount = isSpeaking ? (isGlitchedFrame ? 0.025 : 0.003) : 0;

      // Project vertices
      const projected = VERTICES.map((v, idx) => {
        const isMouth = idx >= 33 && idx <= 40;
        const pt = project(v.x, v.y, v.z, w, h, openAmount, isMouth, jitterAmount);
        return { x: pt.x + shearX, y: pt.y, z: pt.z };
      });

      // Draw connection lines
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6;
      ctx.shadowColor = primaryColor;

      for (const edge of CONNECTIONS) {
        const p1 = projected[edge[0]];
        const p2 = projected[edge[1]];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Draw glowing nodes/dots at vertices
      ctx.fillStyle = nodeColor;
      ctx.shadowBlur = 8;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.shadowBlur = 0; // reset shadow

      // Concentric targeting HUD rings
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(w / 2 + shearX, h / 2, 100, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.setLineDash([5, 20]);
      ctx.beginPath();
      ctx.arc(w / 2 + shearX, h / 2, 115, -angleY, -angleY + 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertical scanner sweep
      scanLineY = (scanLineY + 2) % h;
      ctx.strokeStyle = threatActive ? 'rgba(255, 0, 0, 0.25)' : 'rgba(255, 51, 51, 0.15)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(10, scanLineY);
      ctx.lineTo(w - 10, scanLineY);
      ctx.stroke();

      // Soundwave Spectrum graph at the sides when speaking
      if (isSpeaking) {
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const barHeight = Math.random() * 25 + 2;
          const yOffset = h / 2 - 10 + i * 2;
          // Left visualizer bar
          ctx.moveTo(15, yOffset);
          ctx.lineTo(15 + barHeight * 0.5, yOffset);
          // Right visualizer bar
          ctx.moveTo(w - 15, yOffset);
          ctx.lineTo(w - 15 - barHeight * 0.5, yOffset);
        }
        ctx.stroke();
      }

      // Overlay status telemetry
      ctx.fillStyle = primaryColor;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TRANSMISSION: ${isSpeaking ? 'VOICE_STREAM_ON' : 'STATIONARY_STANDBY'}`, 15, 20);
      ctx.fillText(`MATRIX.V: ${isSpeaking ? 'DYNAMICS_MODULATING' : 'INTEGRITY_SECURE'}`, 15, 30);
      
      ctx.textAlign = 'right';
      ctx.fillText(`HERTZ: 42.1 Hz`, w - 15, 20);
      ctx.fillText(threatActive ? 'CRITICAL_ALERT' : 'NODE_SECURE', w - 15, 30);

      // Random floating hex texts
      if (isSpeaking && Math.random() < 0.05) {
        ctx.fillStyle = 'rgba(255, 51, 51, 0.3)';
        ctx.fillText(`0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`, w - 30, h - 30);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [threatActive, isSpeaking]);

  return (
    <div className={`flex flex-col items-center justify-center bg-transparent relative overflow-hidden select-none ${fullscreen ? 'w-full h-full' : 'w-full h-full'}`}>
      <canvas
        ref={canvasRef}
        width={fullscreen ? 900 : 340}
        height={fullscreen ? 600 : 240}
        className="w-full h-full"
      />

      {/* Hologram status footer */}
      <div className={`absolute ${fullscreen ? 'bottom-8' : 'bottom-2'} flex flex-col items-center justify-center font-mono text-center`}>
        <span className={`${fullscreen ? 'text-sm' : 'text-[10px]'} font-bold tracking-[0.2em] uppercase ${
          threatActive ? 'text-red-500 animate-pulse red-glow' : isSpeaking ? 'text-red-400' : 'text-red-500/70'
        }`}>
          {threatActive ? '⚠️ HOSTILE ANOMALY DETECTED' : isSpeaking ? '🔊 TRANSMITTING — CORE SYNTH ACTIVE' : 'NEURAL CORE STATE: ACTIVE'}
        </span>
        {fullscreen && (
          <span className="text-[10px] text-red-800/60 tracking-widest mt-1 uppercase">
            Red Queen // Umbrella Corp Neural Interface
          </span>
        )}
      </div>
    </div>
  );
}