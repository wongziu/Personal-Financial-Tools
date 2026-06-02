import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { buildExportWorkbook } from "@/lib/export";
import { listAllExportData } from "@/lib/services";

export async function GET() {
  const database = getSeededDatabase();
  const workbook = await buildExportWorkbook(listAllExportData(database));
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=investment-system-export.xlsx"
    }
  });
}
