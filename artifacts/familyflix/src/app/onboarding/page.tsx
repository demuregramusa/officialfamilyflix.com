import { redirect } from "next/navigation";

import { OnboardingExperience } from "@/components/familyflix/onboarding";
import { isStaffRole } from "@/lib/admin/permissions";
import { getUserProfile } from "@/lib/user";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/auth/sign-in");
  if (isStaffRole(profile.role)) redirect("/admin");

  return <OnboardingExperience initialGenres={profile.favoriteGenres} />;
}
