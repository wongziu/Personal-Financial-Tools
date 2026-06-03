import { notFound } from "next/navigation";
import { SecurityDetailPage } from "@/components/security-detail-page";
import { getSeededDatabase } from "@/lib/app-db";
import { getSecurityDetailData } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = getSeededDatabase();
  const data = getSecurityDetailData(database, decodeURIComponent(id));

  if (!data) {
    notFound();
  }

  return <SecurityDetailPage data={data} />;
}
