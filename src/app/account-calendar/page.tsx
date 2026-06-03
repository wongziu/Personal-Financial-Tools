import { AccountCalendarPage } from "@/components/account-calendar-page";
import { getSeededDatabase } from "@/lib/app-db";
import { getAccountCalendarData } from "@/lib/services";

export const dynamic = "force-dynamic";

export default function AccountCalendarRoute() {
  const database = getSeededDatabase();
  const data = getAccountCalendarData(database);
  return <AccountCalendarPage data={data} />;
}
