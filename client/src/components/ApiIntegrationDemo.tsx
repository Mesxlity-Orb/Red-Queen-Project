import React, { useState, useEffect } from 'react';

const DEMO_FEEDS = [
  {
    id: 'feed-1',
    name: 'Threat Intelligence Feed',
    description: 'Pulls real-time IOC (Indicator of Compromise) data from a threat intel JSON endpoint.',
    endpoint: 'https://api.threatintel.example.com/v2/ioc/feed.json',
    status: 'DEMO',
    color: 'border-red-800/40 bg-red-950/10',
    statusColor: 'text-red-500',
    badgeColor: 'border-red-700 bg-red-950/20 text-red-400',
    sampleData: {
      type: 'ioc',
      count: 142,
      severity: 'HIGH',
      updated: '2026-07-19T00:00:00Z',
      indicators: ['10.0.0.5', '192.168.5.22', 'malware.xyz']
    }
  },
  {
    id: 'feed-2',
    name: 'Network Telemetry Stream',
    description: 'Streams live packet analysis metrics from a SIEM appliance via REST API.',
    endpoint: 'https://siem.internal.example.com/api/telemetry.json',
    status: 'DEMO',
    color: 'border-cyan-900/40 bg-cyan-950/10',
    statusColor: 'text-cyan-400',
    badgeColor: 'border-cyan-700 bg-cyan-950/20 text-cyan-400',
    sampleData: {
      packets_per_sec: 48210,
      bandwidth_mbps: 892.4,
      anomaly_score: 0.12,
      top_protocol: 'HTTPS',
      alerts_24h: 3
    }
  },
  {
    id: 'feed-3',
    name: 'Biometric Event Log',
    description: 'Fetches structured JSON logs of biometric access events from the Red Queen core database.',
    endpoint: 'https://redqueen.internal/api/events/biometric.json',
    status: 'DEMO',
    color: 'border-purple-900/40 bg-purple-950/10',
    statusColor: 'text-purple-400',
    badgeColor: 'border-purple-700 bg-purple-950/20 text-purple-400',
    sampleData: {
      total_scans: 391,
      authorized: 388,
      denied: 3,
      last_event: 'AUTHORIZED - OPERATOR_7',
      lockdowns_24h: 1
    }
  },
  {
    id: 'feed-4',
    name: 'AI Model Inference Feed',
    description: 'Receives structured AI inference results from a Gemini / OpenAI model JSON endpoint.',
    endpoint: 'https://api.openai.example.com/v1/chat/completions.json',
    status: 'DEMO',
    color: 'border-yellow-900/40 bg-yellow-950/10',
    statusColor: 'text-yellow-400',
    badgeColor: 'border-yellow-700 bg-yellow-950/20 text-yellow-400',
    sampleData: {
      model: 'gemini-3.5-flash',
      tokens_used: 1842,
      latency_ms: 432,
      sentiment: 'NEUTRAL',
      threat_flag: false
    }
  }
];

const STREAM_LINES = [
  '> [FEED_POLL] Requesting /ioc/feed.json... 200 OK',
  '> [PARSE] 142 threat indicators extracted from payload',
  '> [SIEM] Packet anomaly score: 0.12 — within safe threshold',
  '> [BIO_LOG] AUTHORIZED event recorded: OPERATOR_7',
  '> [AI] Inference latency: 432ms — model: gemini-3.5-flash',
  '> [FEED_POLL] Retry /telemetry.json... 200 OK',
  '> [ALERT] IOC match: 192.168.5.22 flagged in blacklist',
  '> [PARSE] Biometric log snapshot: 391 scans processed',
  '> [SYSTEM] All feed nodes healthy — next poll in 15s',
];

export default function ApiIntegrationDemo() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulatedStream, setSimulatedStream] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setSimulatedStream(prev => {
        const next = [...prev, STREAM_LINES[i % STREAM_LINES.length]];
        if (next.length > 8) next.shift();
        return next;
      });
      i++;
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-cyan-900/40 rounded-lg bg-black/50 overflow-hidden font-mono">
      
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-900/30 bg-cyan-950/10">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-bold tracking-widest uppercase cyan-glow text-cyan-400">
            API Integration Framework
          </h2>
        </div>
        <span className="text-[9px] border border-yellow-800/50 bg-yellow-950/20 text-yellow-500 px-2 py-0.5 rounded uppercase tracking-wider">
          DEMO — No Active Connections
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5">
        
        <p className="text-[10px] text-cyan-700 leading-relaxed uppercase tracking-wide border border-cyan-900/20 bg-cyan-950/5 p-3 rounded">
          The following feeds demonstrate how external JSON API sources can be wired into the Red Queen intelligence core for live data rendering and processing.
          Replace the endpoint URLs with real API sources to activate each feed module.
        </p>

        {/* Feed Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_FEEDS.map((feed) => (
            <div
              key={feed.id}
              className={`border rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:brightness-110 transition-all duration-200 ${feed.color} ${expandedId === feed.id ? 'ring-1 ring-cyan-500/30' : ''}`}
              onClick={() => setExpandedId(expandedId === feed.id ? null : feed.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-white uppercase tracking-wide">{feed.name}</div>
                  <div className="text-[9px] text-cyan-700/80 mt-0.5 leading-relaxed">{feed.description}</div>
                </div>
                <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase shrink-0 ${feed.badgeColor}`}>
                  {feed.status}
                </span>
              </div>

              <div className="text-[8px] text-cyan-900 bg-black/40 border border-cyan-900/20 px-2 py-1.5 rounded font-mono truncate">
                {feed.endpoint}
              </div>

              {expandedId === feed.id && (
                <div className="border border-cyan-900/30 bg-black/60 rounded p-3">
                  <div className="text-[8px] text-cyan-600 mb-1.5 uppercase tracking-wider">Sample Response Payload (DEMO)</div>
                  <pre className="text-[9px] text-cyan-300/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(feed.sampleData, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between text-[8px] mt-auto">
                <span className={`${feed.statusColor} font-bold`}>● {feed.status} MODE</span>
                <span className="text-cyan-900">{expandedId === feed.id ? '▲ COLLAPSE' : '▼ PREVIEW PAYLOAD'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Simulated Live Stream Console */}
        <div className="border border-cyan-900/30 rounded bg-black/70">
          <div className="border-b border-cyan-900/20 px-4 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-600 uppercase tracking-widest">
              Live Feed Stream Simulator (Demo)
            </span>
          </div>
          <div className="p-4 font-mono text-[10px] min-h-[120px] max-h-[180px] overflow-y-auto space-y-0.5">
            {simulatedStream.length === 0 ? (
              <div className="text-cyan-900 animate-pulse uppercase">Initializing stream monitor...</div>
            ) : (
              simulatedStream.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes('ALERT') || line.includes('flagged')
                      ? 'text-red-400'
                      : line.includes('AUTHORIZED') || line.includes('healthy')
                      ? 'text-green-400/80'
                      : 'text-cyan-600/70'
                  }
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[9px] text-cyan-900/60 text-center uppercase tracking-widest pt-1">
          — To activate a feed, replace the endpoint URL and wire it to the Red Queen backend processing pipeline —
        </div>
      </div>
    </div>
  );
}
