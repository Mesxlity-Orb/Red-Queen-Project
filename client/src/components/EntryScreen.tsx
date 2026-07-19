export default function EntryScreen({ onInitiate }: { onInitiate: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div onClick={onInitiate} className="cursor-pointer text-center border border-red-800 p-10 bg-black/80 hover:bg-[#110000]">
        <h1 className="text-4xl font-bold glitch-text mb-4">THE RED QUEEN</h1>
        <p className="text-red-500/70 tracking-widest uppercase">Biometric Authorization Required</p>
        <div className="animate-pulse mt-6 text-sm">[ Click to Initiate Scan ]</div>
      </div>
    </div>
  );
}