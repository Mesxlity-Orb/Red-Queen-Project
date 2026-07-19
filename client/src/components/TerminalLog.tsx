import React from 'react';

export type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'threat';
};

interface TerminalLogProps {
  logs: LogEntry[];
}

export function TerminalLog({ logs }: TerminalLogProps) {
  // Function to parse the sender and message content for custom styling
  const formatLog = (log: LogEntry) => {
    const parts = log.message.split('] > ');
    if (parts.length < 2) {
      return <span className={log.severity === 'threat' ? 'text-red-500 font-bold animate-pulse' : 'text-cyan-400'}>{log.message}</span>;
    }

    const senderWithBracket = parts[0] + ']';
    const messageContent = parts.slice(1).join('] > ');

    // Color code based on sender type
    let senderStyle = 'text-gray-400';
    if (senderWithBracket.includes('RED QUEEN')) {
      senderStyle = log.severity === 'threat' ? 'text-red-500 font-bold red-glow' : 'text-red-400 font-bold';
    } else if (senderWithBracket.includes('SYSTEM')) {
      senderStyle = 'text-cyan-400 font-bold cyan-glow';
    } else if (senderWithBracket.includes('ERROR')) {
      senderStyle = 'text-red-600 font-extrabold animate-pulse';
    } else {
      // User style
      senderStyle = 'text-white font-medium';
    }

    const messageStyle = log.severity === 'threat' 
      ? 'text-red-500 font-semibold' 
      : senderWithBracket.includes('RED QUEEN') 
        ? 'text-red-300/90' 
        : 'text-gray-300';

    return (
      <div className="mb-2.5 leading-relaxed break-words font-mono text-[11px] md:text-xs">
        <span className="text-gray-600 mr-1.5 font-light">[{log.timestamp}]</span>
        <span className={`${senderStyle} mr-2`}>{senderWithBracket}</span>
        <span className="text-red-700 mr-2">&gt;</span>
        <span className={messageStyle}>{messageContent}</span>
      </div>
    );
  };

  if (logs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="text-red-950 text-xs border border-red-950/40 p-4 rounded bg-red-950/5 animate-pulse max-w-sm">
          [ CONSOLE LINK READY ]
          <p className="mt-2 text-[10px] text-red-950/70 font-light">
            Biometric authentication is required to access system modules. Align your face with the biometrics scanner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow space-y-1">
      {logs.map((log) => (
        <div key={log.id}>{formatLog(log)}</div>
      ))}
    </div>
  );
}