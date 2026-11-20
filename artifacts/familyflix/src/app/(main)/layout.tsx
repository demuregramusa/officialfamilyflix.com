import { SiteFooter } from "@/components/familyflix/footer";
import { MyListProvider } from "@/components/familyflix/my-list-provider";
import { SiteHeader, type HeaderUser } from "@/components/familyflix/site-header";
import { SiteNotice } from "@/components/familyflix/site-notice";
import { getSession } from "@/lib/admin-auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user: HeaderUser | undefined = session
    ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? null,
      }
    : undefined;

  return (
    <MyListProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteNotice />
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </MyListProvider>
  );
}
