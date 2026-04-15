"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { NewsCategory, NewsRegion } from "@/lib/types";

interface UserPreferences {
  hasCompletedOnboarding: boolean;
  likedCategories: NewsCategory[];
  likedRegions: NewsRegion[];
  savedArticles: string[];
}

interface UserPreferencesContextType extends UserPreferences {
  isLoaded: boolean;
  completeOnboarding: () => void;
  toggleCategory: (category: NewsCategory) => void;
  toggleRegion: (region: NewsRegion) => void;
  toggleSavedArticle: (articleId: string) => void;
}

const defaultPreferences: UserPreferences = {
  hasCompletedOnboarding: false,
  likedCategories: [],
  likedRegions: [],
  savedArticles: [],
};

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  ...defaultPreferences,
  isLoaded: false,
  completeOnboarding: () => {},
  toggleCategory: () => {},
  toggleRegion: () => {},
  toggleSavedArticle: () => {},
});

export const useUserPreferences = () => useContext(UserPreferencesContext);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aharon_preferences");
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load preferences", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage whenever preferences change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("aharon_preferences", JSON.stringify(preferences));
    }
  }, [preferences, isLoaded]);

  const updatePreference = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const completeOnboarding = () => {
    updatePreference({ hasCompletedOnboarding: true });
  };

  const toggleCategory = (category: NewsCategory) => {
    setPreferences((prev) => {
      const isLiked = prev.likedCategories.includes(category);
      return {
        ...prev,
        likedCategories: isLiked
          ? prev.likedCategories.filter((c) => c !== category)
          : [...prev.likedCategories, category],
      };
    });
  };

  const toggleRegion = (region: NewsRegion) => {
    setPreferences((prev) => {
      const isLiked = prev.likedRegions.includes(region);
      return {
        ...prev,
        likedRegions: isLiked
          ? prev.likedRegions.filter((r) => r !== region)
          : [...prev.likedRegions, region],
      };
    });
  };

  const toggleSavedArticle = (articleId: string) => {
    setPreferences((prev) => {
      const isSaved = prev.savedArticles.includes(articleId);
      return {
        ...prev,
        savedArticles: isSaved
          ? prev.savedArticles.filter((id) => id !== articleId)
          : [...prev.savedArticles, articleId],
      };
    });
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        ...preferences,
        isLoaded,
        completeOnboarding,
        toggleCategory,
        toggleRegion,
        toggleSavedArticle,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}
