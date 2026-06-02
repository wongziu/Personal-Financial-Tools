"use client";

import { DownloadIcon } from "lucide-react";
import { HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { translateUiHelp } from "@/lib/i18n";

export function ExportPage() {
  const { language, t } = useLanguage();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {t.export}
          <HelpTooltip content={translateUiHelp("export.page", language)} label={t.export} />
        </h1>
        <p className="text-sm text-muted-foreground">{t.exportDescription}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <HeaderHelp label={t.downloadWorkbook} help={translateUiHelp("export.workbook", language)} />
          </CardTitle>
          <CardDescription>{t.exportWorkbookDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => { window.location.href = "/api/export"; }}>
            <DownloadIcon data-icon="inline-start" />
            {t.downloadWorkbook}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
