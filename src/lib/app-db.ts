import { getDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";

export function getSeededDatabase() {
  const database = getDatabase();
  seedDemoData(database);
  return database;
}
