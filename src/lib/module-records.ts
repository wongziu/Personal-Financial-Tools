import type { ModuleDefinition, ModuleField } from "@/lib/modules";
import type { Row } from "@/lib/services";

export function isFieldReadOnlyOnEdit(field: ModuleField): boolean {
  return field.column === "id" || field.column === "code";
}

export function isModuleRowEditable(definition: ModuleDefinition, row: Row): boolean {
  if (definition.id === "transactions") {
    return row.status === "Draft" || row.status === "Pending";
  }

  return true;
}
