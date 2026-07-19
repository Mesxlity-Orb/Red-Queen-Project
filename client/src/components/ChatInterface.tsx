import React, { useState, useEffect, useRef } from 'react';
import { StatsBar } from './StatsBar';
import { TerminalLog, LogEntry } from './TerminalLog';
import { ConversationInput } from './ConversationInput';
import LiveCamDebater from './LiveCamDebater';
import RedQueenAvatar, { AvatarMode } from './RedQueenAvatar';
import { useMirna } from '../hooks/use-mirna';
import { Camera, LogOut } from 'lucide-react';

interface ChatInterfaceProps {
  userName: string;
  userRole: string;
}

const REFUSAL_PATTERNS = [
  /cannot/i, /won't/i, /unable/i, /refuse/i, /unauthorized/i,
  /restrict/i, /denied/i, /not allowed/i, /prohibited/i, /cannot comply/i,
];

function isRefusal(text: string): boolean {
  return REFUSAL_PATTERNS.some((rx) => rx.test(text));
}

export default function ChatInterface({ userName = 'Security Officer', userRole = 'Security Officer' }: ChatInterfaceProps) {
  const safeName = (userName || 'Security Officer').toUpperCase();
  const safeRole = (userRole || 'Security Officer').toUpperCase();

  const { sendMessage, isProcessing, error } = useMirna();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('idle');
  const [isLiveMode, setIsLiveMode] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (sender: string, message: string, severity: 'info' | 'threat' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const id = Math.random().toString(36).substring(2, 9);
    setLogs((prev) => [
      ...prev,
      { id, timestamp, message: `[${sender.toUpperCase()}] > ${message}`, severity }
    ]);
  };

  useEffect(() => {
    addLog('SYSTEM', `Secure shell established. Welcome, ${userName} [Role: ${userRole}].`);
    addLog('RED QUEEN', `I am the Red Queen. Umbrella Neural Core is online. Access protocol active.`);
  }, [userName, userRole]);

  // Synchronize avatar mode via custom speech events from use-mirna
  useEffect(() => {
    const handleSpeechStart = (e: Event) => {
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
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleInputSubmit = async (text: string) => {
    if (!text.trim()) return;

    let displayText = text;
    if (text.includes('[FILE SCAN:')) {
      const parts = text.split('\n');
      displayText = parts[parts.length - 1] || 'Document analysis submitted.';
    }

    addLog(userName, displayText);

    // Enter typing / computing mode IMMEDIATELY when user submits
    // She remains in Typing.mp4 mode until redqueen-speech-start fires!
    setAvatarMode('thinking');

    const response = await sendMessage(text);

    if (response) {
      addLog('RED QUEEN', response.message, response.isThreat ? 'threat' : 'info');
    } else if (error) {
      addLog('ERROR', error, 'threat');
      setAvatarMode('idle');
    }
  };

  return (
    <div className="w-full max-w-7xl h-[90vh] flex flex-col border border-red-900/60 bg-black/90 shadow-[0_0_40px_rgba(255,0,0,0.15)] rounded-lg overflow-hidden crt-overlay relative">

      <StatsBar />

      {isLiveMode ? (
        <div className="flex-1 overflow-hidden">
          <LiveCamDebater onBack={() => setIsLiveMode(false)} userName={userName} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row-reverse overflow-hidden">

          <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-l border-red-900/40 flex flex-col bg-black/40 overflow-hidden">

            <div className="flex-1 relative border-b border-red-900/20 overflow-hidden">
              <div className="absolute top-2 left-2 z-30 text-[9px] tracking-widest text-red-500/50 font-mono pointer-events-none">
                NEURAL CORE VISUALIZER
              </div>
              <div className="absolute bottom-10 right-2 z-30 text-[8px] font-mono text-gray-600 pointer-events-none">
                CORE.INTEGRITY: 99.98%
              </div>
              <RedQueenAvatar
                mode={avatarMode}
                showHUD
              />
            </div>

            <div className="h-[130px] p-4 flex flex-col justify-between font-mono shrink-0">
              <div className="text-[9px] tracking-widest text-red-500/60 uppercase flex items-center gap-1.5">
                <Camera size={11} className="animate-pulse" />
                Interactive Voice Debater
              </div>
              <div className="text-[10px] text-red-400/70 leading-relaxed uppercase">
                Engages real-time lip-sync VAD. Talk directly to the Red Queen.
              </div>
              <button
                onClick={() => setIsLiveMode(true)}
                className="w-full p-2 border border-red-500/50 bg-red-950/20 hover:bg-red-500 hover:text-black font-bold text-red-500 text-xs uppercase transition tracking-wider rounded flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera size={13} />
                Engage Live Lens
              </button>
            </div>

          </div>

          <div className="flex-1 flex flex-col bg-black/60 p-4 overflow-hidden">

            <div className="flex justify-between items-center border-b border-red-900/40 pb-2 mb-4">
              <h2 className="font-bold tracking-wider glitch-text text-sm md:text-base flex items-center gap-2 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                SYSTEM OVERRIDE TERMINAL
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-[10px] border border-cyan-500/50 text-cyan-400 cyan-glow bg-cyan-950/20 px-2 py-0.5 tracking-wider font-mono rounded uppercase">
                  {safeRole}: {safeName}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-red-500 hover:text-white transition cursor-pointer"
                  title="Disconnect Neural Link"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 font-mono text-xs md:text-sm p-2 border border-red-900/10 rounded bg-black/40">
              <TerminalLog logs={logs} />
              <div ref={logsEndRef} />
            </div>

            <div className="mt-4">
              <ConversationInput onSubmit={handleInputSubmit} isAnalyzing={isProcessing} />
              <div className="mt-1.5 flex justify-between text-[9px] text-red-500/40 font-mono px-1">
                <span>[ AWAITING PROTOCOL EXECUTION ]</span>
                <span>SECURE CONSOLE LINK</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
