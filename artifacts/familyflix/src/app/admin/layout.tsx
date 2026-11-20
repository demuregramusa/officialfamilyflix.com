import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { getStaffSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | FamilyFlix Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();

  return (
    <AdminShell
      email={session.user.email}
      name={session.user.name}
      role={session.user.role}
    >
      {children}
    </AdminShell>
  );
}
