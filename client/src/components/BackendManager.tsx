import React, { useEffect, useRef, useState } from 'react';
import { getFaceDescriptor } from '../utils/faceDescriptor';
import ApiIntegrationDemo from './ApiIntegrationDemo';
import { API_BASE_URL } from '../utils/apiConfig';

type UserProfile = {
  name: string;
  role: string;
  registeredAt: string;
  descriptorLength: number;
};

export default function BackendManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('Security Officer');
  const [camState, setCamState] = useState<'idle' | 'streaming' | 'capturing' | 'complete' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('STANDBY - AWAITING CONFIG');
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const latestLandmarksRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/biometrics/users`);
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch user profiles:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle deleting a user profile
  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to remove the security profile for ${name}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/biometrics/users/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setStatusMsg(`PROFILE DELETED: ${name.toUpperCase()}`);
        fetchUsers();
      } else {
        setStatusMsg('DELETE FAILURE: USER NOT FOUND');
      }
    } catch (e) {
      setStatusMsg('DELETE FAILURE: CONNECTIONS FAULT');
    }
  };

  // Start registration camera feed
  const startCamera = async () => {
    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass = (window as any).Camera;

    if (!FaceMeshClass || !CameraClass) {
      setStatusMsg('ERROR: BIOMETRICS SUITE UNLOADED');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });

      // Store stream in ref immediately so the useEffect can pick it up
      streamRef.current = mediaStream;
      setStream(mediaStream);
      // Setting camState to 'streaming' triggers React re-render
      // and after that, the useEffect below will safely assign srcObject
      setCamState('streaming');
      setStatusMsg('SCANNER ENGAGED - POSITION FACE');

    } catch (err) {
      console.error(err);
      setCamState('error');
      setStatusMsg('HARDWARE FAULT - CAMERA OFFLINE');
    }
  };

  // Once camState becomes 'streaming' and videoRef is mounted, assign srcObject
  // and initialize FaceMesh. This runs AFTER the React render that shows the video element.
  useEffect(() => {
    if (camState !== 'streaming') return;
    const mediaStream = streamRef.current;
    if (!mediaStream) return;

    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass = (window as any).Camera;

    if (!FaceMeshClass || !CameraClass) {
      setStatusMsg('ERROR: BIOMETRICS SUITE UNLOADED');
      return;
    }

    // videoRef.current is now safely mounted
    if (!videoRef.current) {
      setStatusMsg('ERROR: VIDEO ELEMENT NOT MOUNTED');
      return;
    }

    // Assign stream to video element
    videoRef.current.srcObject = mediaStream;

    // Initialize Face Mesh
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

    // Start camera loop
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
  }, [camState]);

  const stopCamera = () => {
    const activeStream = streamRef.current || stream;
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    setCamState('idle');
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Draw alignment overlay on canvas
  useEffect(() => {
    if (camState !== 'streaming' && camState !== 'capturing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw central capture target ring
      ctx.strokeStyle = latestLandmarksRef.current ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 51, 51, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 80, 0, 2 * Math.PI);
      ctx.stroke();

      // Crosshairs
      ctx.strokeStyle = 'rgba(255, 51, 51, 0.15)';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 100, h / 2);
      ctx.lineTo(w / 2 + 100, h / 2);
      ctx.moveTo(w / 2, h / 2 - 100);
      ctx.lineTo(w / 2, h / 2 + 100);
      ctx.stroke();

      if (latestLandmarksRef.current) {
        // Draw the full face mesh structure dynamically in glowing blue
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 0.5;
        const landmarks = latestLandmarksRef.current;

        // Draw connections for eyes and face oval
        const drawIndices = [
          // face contour
          10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
          // lips
          78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191
        ];

        ctx.beginPath();
        for (let i = 0; i < drawIndices.length; i++) {
          const pt = landmarks[drawIndices[i]];
          if (pt) {
            const xProj = pt.x * w;
            const yProj = pt.y * h;
            if (i === 0) ctx.moveTo(xProj, yProj);
            else ctx.lineTo(xProj, yProj);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [camState]);

  // Handle capturing descriptor and posting to backend
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setStatusMsg('VALIDATION FAIL: NAME FIELD REQUIRED');
      return;
    }
    if (!latestLandmarksRef.current) {
      setStatusMsg('VALIDATION FAIL: POSITION FACE IN FRONT OF SCANNER');
      return;
    }

    setLoading(true);
    setStatusMsg('COMPILING BIOMETRIC DESCRIPTOR...');
    
    // Extract 128-float face signature
    const descriptor = getFaceDescriptor(latestLandmarksRef.current);

    try {
      const res = await fetch(`${API_BASE_URL}/api/biometrics/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          role: roleInput,
          descriptor
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg(`SUCCESS: ENROLLED ${data.name.toUpperCase()} AS ${data.role}`);
        setNameInput('');
        fetchUsers();
        stopCamera();
      } else {
        setStatusMsg(`REGISTRATION FAILED: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg('REGISTRATION FAILED: CONNECTION LOST');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 p-6 border border-cyan-900/60 bg-black/90 shadow-[0_0_40px_rgba(0,240,255,0.1)] rounded-lg crt-overlay text-cyan-400 font-mono">
      
      {/* Top two-column area: Registered Users + Registration Panel */}
      <div className="flex flex-col md:flex-row gap-6">
      {/* Left panel: Registered Database Users list */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2">
          <h2 className="text-lg font-bold tracking-widest cyan-glitch-text uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Biometric Database Registry
          </h2>
          <a href="/" className="text-xs hover:text-white transition uppercase border border-cyan-900 px-2 py-0.5 rounded bg-cyan-950/20">
            [ Logscreen Terminal ]
          </a>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[460px] border border-cyan-900/20 bg-black/40 rounded p-3">
          {users.length === 0 ? (
            <div className="text-center text-xs text-cyan-700 py-20 uppercase animate-pulse">
              [ Empty Database - Security Profile Setup Required ]
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.name} className="flex justify-between items-center border border-cyan-900/35 bg-cyan-950/5 p-3 rounded hover:border-cyan-400/50 transition">
                  <div>
                    <div className="text-sm font-bold text-white uppercase">{user.name}</div>
                    <div className="text-[10px] text-cyan-500/80 uppercase mt-0.5">
                      Role: <span className="text-cyan-400">{user.role}</span> | Signature Vector: {user.descriptorLength} pts
                    </div>
                    <div className="text-[9px] text-cyan-700 mt-0.5">
                      Enrolled: {new Date(user.registeredAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(user.name)}
                    className="text-[10px] border border-red-900 text-red-500 hover:bg-red-950/30 hover:border-red-500 transition px-2.5 py-1 uppercase rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Add/Register New Biometrics */}
      <div className="w-full md:w-2/5 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-cyan-900/40 pt-6 md:pt-0 md:pl-6">
        <h2 className="text-sm font-bold tracking-widest border-b border-cyan-900/50 pb-2 uppercase">
          Create Access Profile
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase text-cyan-600 font-bold mb-1.5">User Identity Name</label>
            <input
              type="text"
              required
              disabled={loading}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Rabih Fatta"
              className="w-full bg-black border border-cyan-900 text-cyan-400 p-2 text-xs focus:outline-none focus:border-cyan-400 rounded placeholder:text-cyan-950"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-cyan-600 font-bold mb-1.5">Access Role</label>
            <select
              value={roleInput}
              disabled={loading}
              onChange={(e) => setRoleInput(e.target.value)}
              className="w-full bg-black border border-cyan-900 text-cyan-400 p-2 text-xs focus:outline-none focus:border-cyan-400 rounded"
            >
              <option value="Administrator">Administrator</option>
              <option value="Security Officer">Security Officer</option>
              <option value="Cyber Analyst">Cyber Analyst</option>
              <option value="SAS Compliance Officer">SAS Compliance Officer</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] uppercase text-cyan-600 font-bold">Biometrics Scanner</label>
            <div className="relative w-full h-[180px] bg-black border border-cyan-950 rounded overflow-hidden">
              {/* Video is ALWAYS in the DOM so videoRef.current is never null.
                  We use CSS visibility/opacity to hide it when not streaming. */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover absolute inset-0 grayscale brightness-90 contrast-125 transition-opacity duration-300 ${
                  camState !== 'idle' && camState !== 'error' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <canvas
                ref={canvasRef}
                width={320}
                height={180}
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
              />

              {camState === 'idle' && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-3 text-center z-20">
                  <div className="text-[10px] text-cyan-700 uppercase mb-3">[ Biometric Lens Inactive ]</div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="border border-cyan-900 hover:border-cyan-400 bg-cyan-950/20 text-cyan-400 px-3 py-1.5 text-[10px] rounded uppercase transition"
                  >
                    Activate Camera
                  </button>
                </div>
              )}

              {camState === 'error' && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-3 text-center z-20">
                  <div className="text-[10px] text-red-500 uppercase animate-pulse">[ Camera Hardware Fault ]</div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 border border-red-900 hover:border-red-400 bg-red-950/20 text-red-400 px-3 py-1.5 text-[10px] rounded uppercase transition"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
            
            {camState !== 'idle' && camState !== 'error' && (
              <button
                type="button"
                onClick={stopCamera}
                className="border border-red-900 text-red-500 hover:bg-red-950/20 transition py-1 text-[9px] rounded uppercase"
              >
                Deactivate Lens
              </button>
            )}
          </div>

          <div className="bg-cyan-950/20 border border-cyan-900/40 p-2.5 rounded text-[9px] text-cyan-500/80">
            <div>NODE PARAMETER SUMMARY:</div>
            <div className="mt-1 text-cyan-400 font-bold">LENS_STATUS: {statusMsg}</div>
            <div className="mt-0.5">MATRIX_REG: SHA-256 DESCRIPTOR EXTRACTION ACTIVE</div>
          </div>

          <button
            type="submit"
            disabled={loading || !latestLandmarksRef.current}
            className="w-full p-2.5 font-bold text-xs tracking-wider uppercase rounded border border-cyan-400 bg-cyan-950/30 hover:bg-cyan-400 hover:text-black transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'ENROLLING PROTOCOLS...' : 'Scan & Register User'}
          </button>
        </form>
      </div>
      </div>{/* end two-column row */}

      {/* ── API INTEGRATION DEMO ── */}
      <ApiIntegrationDemo />

    </div>
  );
}

