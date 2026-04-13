"use client";

/**
 * LiveIndicator — Pulsing green dot with "LIVE" text
 * Shows real-time connection status
 */
export default function LiveIndicator({ isConnected = true }: { isConnected?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <span
          className={`absolute h-3 w-3 rounded-full ${
            isConnected ? "bg-emerald-400" : "bg-amber-400"
          } animate-pulse-ring`}
        />
        {/* Inner solid dot */}
        <span
          className={`relative h-2.5 w-2.5 rounded-full ${
            isConnected ? "bg-emerald-400" : "bg-amber-400"
          } animate-pulse-live shadow-lg ${
            isConnected ? "shadow-emerald-400/50" : "shadow-amber-400/50"
          }`}
        />
      </div>
      <span
        className={`text-[11px] font-bold tracking-wider ${
          isConnected ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        {isConnected ? "LIVE" : "CONNECTING"}
      </span>
    </div>
  );
}
