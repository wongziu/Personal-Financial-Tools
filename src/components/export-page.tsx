"use client";

import { DownloadIcon } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExportPage() {
  const { t } = useLanguage();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.export}</h1>
        <p className="text-sm text-muted-foreground">Export all V1 modules into one workbook with multiple sheets.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t.downloadWorkbook}</CardTitle>
          <CardDescription>Accounts, securities, transactions, cashflows, prices, FX, sources, theses, events, decisions, risk rules, and exceptions.</CardDescription>
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
