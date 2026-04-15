"use client";

import { Home, Search, Bookmark, User } from "lucide-react";

export type AppTab = "home" | "search" | "foryou" | "profile";

interface BottomNavigationProps {
  currentTab: AppTab;
  setTab: (tab: AppTab) => void;
}

export default function BottomNavigation({ currentTab, setTab }: BottomNavigationProps) {
  const tabs: { id: AppTab; icon: React.ReactNode }[] = [
    { id: "home", icon: <Home className="h-5 w-5" /> },
    { id: "search", icon: <Search className="h-5 w-5" /> },
    { id: "foryou", icon: <Bookmark className="h-5 w-5" /> },
    { id: "profile", icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav
        className="pointer-events-auto flex items-center justify-between rounded-full bg-white px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100"
        style={{ width: "280px" }}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-[#1959FF] text-white shadow-md shadow-blue-500/20"
                  : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
