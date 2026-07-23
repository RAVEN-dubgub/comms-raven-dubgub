import { redirect } from "next/navigation";
import { CommsWorkspace } from "@/components/comms-workspace";
import { requireUser } from "@/lib/auth";
import { pmPlatformUrl } from "@/lib/comms";

export default async function AppPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  return <CommsWorkspace user={user} pmUrl={pmPlatformUrl()} />;
}
