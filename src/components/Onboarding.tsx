"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import type { NewsCategory, NewsRegion } from "@/lib/types";

const CATEGORIES: { id: NewsCategory; label: string; icon: string }[] = [
  { id: "ביטחוני", label: "ביטחוני", icon: "🛡️" },
  { id: "אזעקות", label: "אזעקות", icon: "🚨" },
  { id: "פוליטי", label: "פוליטי", icon: "🏛️" },
  { id: "מדיני", label: "מדיני", icon: "🌍" },
  { id: "פלילי", label: "פלילי", icon: "⚖️" },
  { id: "כללי", label: "כללי", icon: "📰" },
];

const REGIONS: { id: NewsRegion; label: string; icon: string }[] = [
  { id: "צפון", label: "צפון", icon: "⛰️" },
  { id: "שרון", label: "השרון", icon: "🌳" },
  { id: "דן", label: "גוש דן", icon: "🏢" },
  { id: "ירושלים", label: "ירושלים", icon: "🕍" },
  { id: "שפלה", label: "השפלה", icon: "🌾" },
  { id: "דרום", label: "דרום", icon: "🏜️" },
  { id: "ארצי", label: "ארצי (הכל)", icon: "🇮🇱" },
];

export default function Onboarding() {
  const {
    isLoaded,
    hasCompletedOnboarding,
    likedCategories,
    likedRegions,
    toggleCategory,
    toggleRegion,
    completeOnboarding,
  } = useUserPreferences();

  const [step, setStep] = useState(1);

  if (!isLoaded || hasCompletedOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#EFEFEF] overflow-y-auto">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-[#F8F9FA] px-6 py-12 shadow-2xl">
        
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-gray-50"
            >
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </button>
          ) : (
            <div className="h-10 w-10" />
          )}
          <span className="text-lg font-bold text-[#16161B]">התאמה אישית</span>
          <div className="h-10 w-10" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              <h1 className="mb-2 text-3xl font-extrabold text-[#16161B]">מה מעניין אותך?</h1>
              <p className="mb-8 text-base text-slate-500">בחר את הנושאים שאתה רוצה לעקוב אחריהם</p>

              <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => {
                  const isSelected = likedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`relative flex flex-col items-center justify-center gap-3 rounded-[1.5rem] p-6 text-center transition-all ${
                        isSelected
                          ? "bg-[#1959FF] text-white shadow-[0_8px_20px_rgba(25,89,255,0.3)]"
                          : "bg-white text-[#16161B] shadow-sm hover:shadow-md"
                      }`}
                    >
                      <span className="text-3xl">{cat.icon}</span>
                      <span className="font-bold">{cat.label}</span>
                      {isSelected && (
                        <div className="absolute top-3 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              <h1 className="mb-2 text-3xl font-extrabold text-[#16161B]">מאיפה אתה בארץ?</h1>
              <p className="mb-8 text-base text-slate-500">קבל התרעות וכתבות רלוונטיות לאזורך</p>

              <div className="grid grid-cols-2 gap-4">
                {REGIONS.map((region) => {
                  const isSelected = likedRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      onClick={() => toggleRegion(region.id)}
                      className={`relative flex flex-col items-center justify-center gap-3 rounded-[1.5rem] p-6 text-center transition-all ${
                        isSelected
                          ? "bg-[#1959FF] text-white shadow-[0_8px_20px_rgba(25,89,255,0.3)]"
                          : "bg-white text-[#16161B] shadow-sm hover:shadow-md"
                      }`}
                    >
                      <span className="text-3xl">{region.icon}</span>
                      <span className="font-bold">{region.label}</span>
                      {isSelected && (
                        <div className="absolute top-3 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-12 flex justify-center pb-8">
          <button
            onClick={() => {
              if (step === 1) setStep(2);
              else completeOnboarding();
            }}
            className="w-full rounded-full bg-[#1959FF] px-8 py-4 text-lg font-bold text-white shadow-[0_8px_24px_rgba(25,89,255,0.35)] transition-transform active:scale-95"
          >
            {step === 1 ? "המשך" : "סיום והתחל לקרוא"}
          </button>
        </div>
      </div>
    </div>
  );
}
