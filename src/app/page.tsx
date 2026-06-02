import { DashboardView } from "@/components/dashboard-view";
import { getSeededDatabase } from "@/lib/app-db";
import { getDashboardData } from "@/lib/services";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const database = getSeededDatabase();
  const data = getDashboardData(database);
  return <DashboardView data={data} />;
}
