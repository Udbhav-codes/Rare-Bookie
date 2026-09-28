import type { Metadata } from "next";
import { listAdmins } from "@/app/actions/admins";
import { getAdmin } from "@/lib/auth";
import { AdminsView } from "./AdminsView";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const [admins, me] = await Promise.all([listAdmins(), getAdmin()]);
  return <AdminsView admins={admins} meId={me!.id} />;
}
