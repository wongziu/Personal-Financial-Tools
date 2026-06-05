"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultAppSettings, type AppSettings } from "@/lib/app-settings";

interface AppSettingsContextValue {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  reloadSettings: () => Promise<AppSettings>;
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);

  const reloadSettings = useCallback(async () => {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Failed to load settings");
    }

    const payload = (await response.json()) as { settings?: AppSettings };
    const nextSettings = payload.settings ?? defaultAppSettings;
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  useEffect(() => {
    reloadSettings().catch(() => undefined);
  }, [reloadSettings]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      reloadSettings
    }),
    [reloadSettings, settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }

  return context;
}
