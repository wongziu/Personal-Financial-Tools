"use client";

import { CircleHelpIcon } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HelpTooltip({ content, label }: { content: string; label: string }) {
  const { language } = useLanguage();
  const prefix = language === "en-US" ? "Help" : language === "zh-TW" ? "說明" : "说明";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${prefix}: ${label}`}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <CircleHelpIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-xs leading-relaxed" side="top" align="start">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function requirementLabel(required: boolean | undefined, language: string): string {
  if (language === "en-US") {
    return required ? "required" : "optional";
  }
  if (language === "zh-TW") {
    return required ? "必填" : "選填";
  }
  return required ? "必填" : "选填";
}

function FieldRequirementIndicator({ required }: { required?: boolean }) {
  const { language } = useLanguage();

  return (
    <span
      data-field-requirement={required ? "required" : "optional"}
      className={cn(
        "select-none text-[11px] font-normal leading-none text-muted-foreground",
        required ? "opacity-80" : "opacity-60"
      )}
    >
      ({requirementLabel(required, language)})
    </span>
  );
}

export function FieldLabel({ htmlFor, label, help, required }: { htmlFor?: string; label: string; help: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <FieldRequirementIndicator required={required} />
      <HelpTooltip content={help} label={label} />
    </div>
  );
}

export function HeaderHelp({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <HelpTooltip content={help} label={label} />
    </div>
  );
}
