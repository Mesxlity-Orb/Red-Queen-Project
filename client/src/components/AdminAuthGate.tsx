import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

interface AdminAuthGateProps {
  onAuthorized: () => void;
}

const ADMIN_PASSWORD = 'P@ssw0rd';

export default function AdminAuthGate({ onAuthorized }: AdminAuthGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (password === ADMIN_PASSWORD) {
      onAuthorized();
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setError(`AUTHORIZATION FAILURE — INVALID CREDENTIAL (${3 - next} ATTEMPT${3 - next === 1 ? '' : 'S'} REMAINING)`);
      setPassword('');
      triggerShake();

      if (next >= 3) {
        setLocked(true);
        setError('SECURITY BREACH DETECTED — ACCESS REVOKED FOR 60s');
        let countdown = 60;
        setLockCountdown(countdown);

        const timer = setInterval(() => {
          countdown -= 1;
          setLockCountdown(countdown);
          if (countdown <= 0) {
            clearInterval(timer);
            setLocked(false);
            setAttempts(0);
            setError('');
            setLockCountdown(0);
          }
        }, 1000);
      }
    }
  };

  return (
    <div className="w-full max-w-md border border-cyan-900/60 bg-black/95 rounded-lg shadow-[0_0_60px_rgba(0,240,255,0.1)] crt-overlay overflow-hidden font-mono">
      
      {/* Header */}
      <div className="bg-cyan-950/30 border-b border-cyan-900/50 p-5 flex items-center gap-3">
        <Shield className="text-cyan-400 animate-pulse" size={22} />
        <div>
          <h1 className="text-sm font-bold tracking-widest text-cyan-400 uppercase cyan-glow">
            Red Queen Admin Portal
          </h1>
          <p className="text-[9px] text-cyan-700 tracking-wider mt-0.5 uppercase">
            Biometric Database Registry — Restricted Access
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5">
        
        {/* Security Badge */}
        <div className="flex items-center gap-3 border border-cyan-900/30 bg-cyan-950/10 p-3 rounded">
          <Lock size={14} className="text-cyan-600 shrink-0" />
          <div className="text-[9px] text-cyan-600 leading-relaxed uppercase">
            This portal is restricted to <span className="text-cyan-400 font-bold">Administrator-level personnel</span> only. Unauthorized access is logged and prosecuted.
          </div>
        </div>

        {/* Lockout Screen */}
        {locked && (
          <div className="text-center border border-red-900/60 bg-red-950/20 rounded p-5">
            <div className="text-red-500 font-bold text-sm animate-pulse mb-1 tracking-wider">⚠ SECURITY LOCKOUT</div>
            <div className="text-[10px] text-red-400 mb-3">Access suspended due to repeated authentication failures.</div>
            <div className="text-3xl font-bold text-red-500 red-glow font-mono tabular-nums">
              00:{lockCountdown.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] text-red-700 mt-2 uppercase">Retry window opens after timer expires</div>
          </div>
        )}

        {/* Login Form */}
        {!locked && (
          <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            <div>
              <label className="block text-[10px] uppercase text-cyan-600 font-bold mb-2 tracking-wider">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  placeholder="Enter admin password..."
                  className="w-full bg-black border border-cyan-900 text-cyan-400 p-3 pr-10 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 rounded placeholder:text-cyan-950 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-700 hover:text-cyan-400 transition"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[10px] text-red-500 border border-red-900/50 bg-red-950/10 p-2.5 rounded tracking-wide animate-pulse">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim()}
              className="w-full p-3 font-bold text-xs tracking-widest uppercase rounded border border-cyan-400/70 bg-cyan-950/30 hover:bg-cyan-400 hover:text-black transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Authenticate Admin Access
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center text-[9px] text-cyan-900 border-t border-cyan-950 pt-3 mt-1">
          <span>RSA-4096 ENCRYPTED CHANNEL</span>
          <a href="/" className="hover:text-cyan-600 transition underline">← Back to Terminal</a>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
