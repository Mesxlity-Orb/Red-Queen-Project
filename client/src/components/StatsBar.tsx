export function StatsBar() {
  return (
    <div className="h-10 border-b border-cyan-900/50 bg-black/80 flex items-center justify-between px-4 text-xs font-mono shrink-0 relative z-30">
      <div className="flex items-center gap-6">
        <span className="text-red-500 font-bold tracking-widest text-sm drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">THE RED QUEEN</span>
        <span className="text-gray-500">SYSTEM.STATUS: <span className="text-cyan-400 font-bold">ONLINE</span></span>
      </div>
      
      <div className="flex items-center gap-6 text-[10px] tracking-widest">
        <span className="text-gray-500">THREAT ASSESSOR: <span className="text-cyan-400 font-bold">ACTIVE</span></span>
      </div>
    </div>
  );
}