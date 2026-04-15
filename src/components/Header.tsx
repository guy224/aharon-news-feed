"use client";

import { Bell, User } from "lucide-react";
import LiveIndicator from "./LiveIndicator";

/**
 * Header — Clean Editorial Top Navigation
 */
export default function Header({ isConnected = true }: { isConnected?: boolean }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-[#FFFFFF] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-gray-100">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
        
        {/* User Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-slate-500 hover:bg-gray-200 transition-colors cursor-pointer">
          <User className="h-5 w-5" />
        </div>

        {/* Title */}
        <div className="flex flex-col items-center leading-none">
          <span className="text-lg font-bold tracking-tight text-[#16161B] font-sans">
            אהרון ידיעות
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LiveIndicator isConnected={isConnected} />
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-slate-500 hover:text-[#1959FF] transition-colors cursor-pointer">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#1959FF] ring-2 ring-white" />
          </div>
        </div>
        
      </header>
    </div>
  );
}
