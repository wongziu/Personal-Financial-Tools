"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button variant="outline" size="sm" onClick={() => setTheme(nextTheme)} title={t.theme}>
      {resolvedTheme === "dark" ? <SunIcon data-icon="inline-start" /> : <MoonIcon data-icon="inline-start" />}
      {resolvedTheme === "dark" ? t.light : t.dark}
    </Button>
  );
}
