"use client";

import { CircleHelpIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HelpTooltip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} 说明`}
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

export function FieldLabel({ htmlFor, label, help }: { htmlFor?: string; label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
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
