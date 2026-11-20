import { redirect } from "next/navigation";

import { MemberSignUpForm } from "@/components/familyflix/auth-forms";
import { getSession } from "@/lib/admin-auth";
import { isStaffRole } from "@/lib/admin/permissions";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) {
    redirect(isStaffRole(session.user.role) ? "/admin" : "/");
  }

  return <MemberSignUpForm />;
}
