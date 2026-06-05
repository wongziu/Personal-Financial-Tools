import { getDatabase } from "@/lib/db/client";
import type { DatabaseContext } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";

export function shouldSeedDemoData(database: DatabaseContext): boolean {
  const row = database.sqlite.prepare("SELECT COUNT(*) AS count FROM accounts").get() as { count: number };
  return row.count === 0;
}

export function getSeededDatabase() {
  const database = getDatabase();
  if (shouldSeedDemoData(database)) {
    seedDemoData(database);
  }
  return database;
}
