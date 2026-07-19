import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { Mic, Paperclip, Check, Trash } from 'lucide-react';

interface ConversationInputProps {
  onSubmit: (text: string) => void;
  isAnalyzing: boolean;
}

type OptimizationStats = {
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
  fileName: string;
};

export function ConversationInput({ onSubmit, isAnalyzing }: ConversationInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + resultText : resultText));
        setIsRecording(false);
      };

      rec.onerror = (err: any) => {
        console.error('Speech Recognition Error:', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert('Speech synthesis/recognition is not fully supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Local Sanitization & Extractive Summarization (Token bandwidth optimization)
      const originalLines = text.split('\n');
      const filteredLines: string[] = [];

      // Extract lines containing key technical/security keywords
      const keywords = /error|fail|critical|warning|exception|cve|exploit|attack|unauthorized|ip|port|sas|compliance|audit|matrix|deny/i;
      
      originalLines.forEach((line, index) => {
        // limit characters per line to keep it clean
        const trimmed = line.trim();
        if (keywords.test(trimmed)) {
          filteredLines.push(`[L-${index + 1}] ${trimmed.substring(0, 150)}`);
        }
      });

      // If nothing matches keywords, or file is small, take basic outline
      if (filteredLines.length === 0) {
        // Take first 15 and last 15 lines
        if (originalLines.length <= 30) {
          filteredLines.push(...originalLines.map((l, i) => `[L-${i + 1}] ${l.substring(0, 150)}`));
        } else {
          filteredLines.push(...originalLines.slice(0, 15).map((l, i) => `[L-${i + 1}] ${l.substring(0, 150)}`));
          filteredLines.push('... [Lines truncated for token compression] ...');
          filteredLines.push(...originalLines.slice(-15).map((l, i) => `[L-${originalLines.length - 15 + i + 1}] ${l.substring(0, 150)}`));
        }
      } else if (filteredLines.length > 50) {
        // Cap key error extracts to avoid bloating
        filteredLines.splice(50);
        filteredLines.push('... [Lines truncated to prevent memory overload] ...');
      }

      const condensedText = `[FILE SCAN: ${file.name}]
Total original lines: ${originalLines.length}
Telemetry summary:
${filteredLines.join('\n')}`;

      const originalSize = text.length;
      const optimizedSize = condensedText.length;
      const savingsPercent = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

      setDocumentContext(condensedText);
      setStats({
        originalSize,
        optimizedSize,
        savingsPercent,
        fileName: file.name
      });
      setShowStatsModal(true);
    };

    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again
    e.target.value = '';
  };

  const handleDiscardContext = () => {
    setDocumentContext(null);
    setStats(null);
    setShowStatsModal(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return;

    let finalPrompt = '';
    if (documentContext) {
      finalPrompt += `[SYSTEM NOTE: The user uploaded file: "${stats?.fileName}". Local scanning summarized it to save tokens. Use this context to answer:\n---\n${documentContext}\n---\n]\n`;
    }
    finalPrompt += input.trim() || 'Analyze the attached document.';

    onSubmit(finalPrompt);
    setInput('');
    // Clear document context after submitting
    setDocumentContext(null);
    setStats(null);
  };

  return (
    <div className="w-full flex flex-col gap-2 relative">
      {/* Document Optimization HUD Banner */}
      {stats && (
        <div className="bg-red-950/20 border border-red-900/50 rounded p-2 text-[10px] flex justify-between items-center font-mono">
          <div className="flex items-center gap-1.5 text-red-400">
            <Paperclip size={10} className="text-red-500" />
            <span className="font-bold uppercase">ATTACHED: {stats.fileName}</span>
            <span className="text-[9px] text-green-400">({stats.savingsPercent}% neural bandwidth saved)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStatsModal(true)}
              className="text-cyan-400 hover:text-white transition underline uppercase text-[8px]"
            >
              [ Stats ]
            </button>
            <button
              onClick={handleDiscardContext}
              className="text-red-500 hover:text-red-400 transition"
              title="Discard Document"
            >
              <Trash size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="p-2.5 bg-black border border-red-900/60 text-red-500 hover:text-red-400 hover:border-red-500 transition rounded flex items-center justify-center cursor-pointer"
          title="Upload telemetry/log file"
        >
          <Paperclip size={16} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".txt,.log,.json,.csv,.md,.js,.ts,.py,.yaml,.xml,.html"
        />

        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isAnalyzing}
          className="flex-1 bg-black border border-red-900/60 text-red-500 p-2.5 text-xs md:text-sm font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 rounded disabled:opacity-50 placeholder:text-red-950"
          placeholder={isAnalyzing ? "SYSTEM ANALYSING..." : isRecording ? "DICTATE QUERY..." : "Awaiting input sequence..."}
        />

        {/* Mic Button */}
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={isAnalyzing}
          className={`p-2.5 bg-black border text-red-500 hover:text-red-400 hover:border-red-500 transition rounded flex items-center justify-center cursor-pointer ${
            isRecording ? 'border-red-500 bg-red-950/20 animate-pulse' : 'border-red-900/60'
          }`}
          title="Voice input"
        >
          <Mic size={16} />
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={isAnalyzing || (!input.trim() && !documentContext)}
          className="system-btn px-6 font-bold font-mono text-xs md:text-sm tracking-wider uppercase rounded cursor-pointer"
        >
          Execute
        </button>
      </form>

      {/* Local Scan Stats Dialog */}
      {showStatsModal && stats && (
        <div className="absolute bottom-12 left-0 right-0 z-40 bg-black border border-red-900 p-4 rounded shadow-2xl font-mono text-[10px] text-red-400">
          <div className="flex justify-between items-center border-b border-red-900 pb-1.5 mb-2 font-bold text-red-500">
            <span>LOCAL LOG ANALYZER STATE</span>
            <button
              onClick={() => setShowStatsModal(false)}
              className="text-[9px] hover:text-white uppercase transition"
            >
              [ Close ]
            </button>
          </div>
          <div className="space-y-1">
            <div>FILE NAME: <span className="text-white">{stats.fileName}</span></div>
            <div>ORIGINAL SIZE: <span className="text-white">{stats.originalSize} chars</span></div>
            <div>COMPRESSED SIZE: <span className="text-white">{stats.optimizedSize} chars</span></div>
            <div className="text-green-400 font-bold">BANDWIDTH REDUCTION: {stats.savingsPercent}%</div>
          </div>
          <div className="mt-3 bg-red-950/15 border border-red-950 p-2 rounded max-h-36 overflow-y-auto text-[9px] text-red-300">
            <span className="font-bold text-red-400 uppercase text-[8px] block mb-1">Scanned context extracts:</span>
            <pre className="whitespace-pre-wrap">{documentContext}</pre>
          </div>
        </div>
      )}
    </div>
  );
}