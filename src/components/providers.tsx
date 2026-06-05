"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppSettingsProvider } from "@/components/app-settings-provider";
import { LanguageProvider } from "@/components/language-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider delayDuration={200}>
        <LanguageProvider>
          <AppSettingsProvider>
            {children}
            <Toaster />
          </AppSettingsProvider>
        </LanguageProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
