import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";

const database = createDatabase();
seedDemoData(database);
database.sqlite.close();

console.log("Seeded demo data into data/investment-system.sqlite");
