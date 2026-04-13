"use client";

import { Zap } from "lucide-react";
import LiveIndicator from "./LiveIndicator";

/**
 * Header — Sticky top bar with channel name and live indicator
 * Glassmorphism style with RTL support
 */
export default function Header({ isConnected = true }: { isConnected?: boolean }) {
  return (
    <header
      id="main-header"
      className="glass-strong sticky top-0 z-50 border-b border-slate-800/50"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        {/* Channel Identity */}
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 text-white" fill="white" />
          </div>

          {/* Channel name */}
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-tight text-slate-50">
              אהרון ידיעות
            </h1>
            <span className="text-[11px] text-slate-400">
              עדכונים בזמן אמת
            </span>
          </div>
        </div>

        {/* Live indicator */}
        <LiveIndicator isConnected={isConnected} />
      </div>
    </header>
  );
}
