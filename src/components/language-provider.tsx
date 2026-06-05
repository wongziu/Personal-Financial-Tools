"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, normalizeLanguage, type Dictionary, type Language } from "@/lib/i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh-CN");

  useEffect(() => {
    setLanguageState(normalizeLanguage(window.localStorage.getItem("investment-system-language")));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("investment-system-language", nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: dictionaries[language]
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
