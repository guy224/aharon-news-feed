"use client";

import { Zap } from "lucide-react";
import LiveIndicator from "./LiveIndicator";

/**
 * Header — Dynamic Island-style floating pill
 * Fixed at top-center with Apple glass aesthetic
 */
export default function Header({ isConnected = true }: { isConnected?: boolean }) {
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-5 z-50 flex justify-center px-4">
      <header
        id="main-header"
        className="pointer-events-auto animate-island flex items-center gap-3 rounded-full px-5 py-2.5"
        style={{
          background: "rgba(15, 15, 20, 0.82)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Icon badge */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
          <Zap className="h-3.5 w-3.5 text-white" fill="white" />
        </div>

        {/* Channel name */}
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-white/95">
            אהרון ידיעות
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
            עדכוני חדשות
          </span>
        </div>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-white/10" />

        {/* Live indicator */}
        <LiveIndicator isConnected={isConnected} />
      </header>
    </div>
  );
}
