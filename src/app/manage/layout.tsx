import { requireAdmin } from "@/lib/auth";
import { ManageTabs } from "./ManageTabs";

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-gilt-ink">Signed in as {admin.name}</p>
          <h1 className="display mt-1 text-[clamp(2.25rem,5vw,3.5rem)]">Manage</h1>
        </div>
      </div>
      <ManageTabs />
      <div className="pt-8">{children}</div>
    </div>
  );
}
