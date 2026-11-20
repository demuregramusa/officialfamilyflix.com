import { redirect } from "next/navigation";

import { MemberSignInForm } from "@/components/familyflix/auth-forms";
import { getSession } from "@/lib/admin-auth";
import { isStaffRole } from "@/lib/admin/permissions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(isStaffRole(session.user.role) ? "/admin" : "/");
  }

  const { redirectTo } = await searchParams;

  return <MemberSignInForm redirectTo={redirectTo ?? "/"} />;
}
