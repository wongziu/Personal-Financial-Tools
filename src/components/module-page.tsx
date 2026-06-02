"use client";

import { useMemo, useState, useTransition } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModuleDefinition, ModuleField } from "@/lib/modules";
import type { Row } from "@/lib/services";
import { FieldLabel, HeaderHelp } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { translateColumn, translateColumnHelp, translateEnum, translateFieldHelp, translateText, type Language } from "@/lib/i18n";

function displayValue(value: unknown, language: Language): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as string[]).map((item) => translateEnum(item, language)).join(", ");
    } catch {
      return translateEnum(value, language);
    }
  }

  return translateEnum(String(value), language);
}

function initialFieldValue(field: ModuleField): string | boolean {
  if (field.defaultValue !== undefined) {
    return typeof field.defaultValue === "boolean" ? field.defaultValue : String(field.defaultValue);
  }

  if (field.type === "boolean") {
    return false;
  }

  if (field.type === "date") {
    return new Date().toISOString().slice(0, 10);
  }

  return "";
}

function FieldControl({
  field,
  value,
  onChange
}: {
  field: ModuleField;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const { language } = useLanguage();
  const label = language === "en-US" ? field.labelEn : translateText(field.labelZh, language);
  const help = translateFieldHelp({
    column: field.column,
    labelZh: field.labelZh,
    labelEn: field.labelEn,
    language
  });

  if (field.type === "textarea" || field.type === "tags") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} />
        <Textarea
          id={field.name}
          name={field.name}
          value={String(value)}
          placeholder={field.type === "tags" ? "AI Capex, USD" : undefined}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} />
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem value={option} key={option}>
                {translateEnum(option, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} />
        <Switch id={field.name} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={field.name} label={label} help={help} />
      <Input
        id={field.name}
        name={field.name}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.type === "number" ? "any" : undefined}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    </div>
  );
}

export function ModulePage({ definition, rows }: { definition: ModuleDefinition; rows: Row[] }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(definition.fields.map((field) => [field.name, initialFieldValue(field)]))
  );

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  const title = language === "en-US" ? definition.navLabelEn : translateText(definition.navLabelZh, language);
  const description = language === "en-US" ? definition.descriptionEn : translateText(definition.descriptionZh, language);

  const submit = () => {
    startTransition(async () => {
      const response = await fetch(`/api/modules/${definition.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(t.formSaved);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              {t.newRecord}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              {definition.fields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  value={formValues[field.name] ?? ""}
                  onChange={(value) => setFormValues((current) => ({ ...current, [field.name]: value }))}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {t.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {filteredRows.length} {t.records}
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {definition.tableColumns.map((column) => (
                  <TableHead key={column}>
                    <HeaderHelp
                      label={translateColumn(definition.table, column, language)}
                      help={translateColumnHelp(definition.table, column, language)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={definition.tableColumns.length} className="text-center text-muted-foreground">
                    {t.noRecords}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, index) => (
                  <TableRow key={`${definition.id}-${index}`}>
                    {definition.tableColumns.map((column) => (
                      <TableCell key={column}>
                        {column.includes("status") || column.includes("severity") ? (
                          <Badge variant="secondary">{displayValue(row[column], language)}</Badge>
                        ) : (
                          displayValue(row[column], language)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
