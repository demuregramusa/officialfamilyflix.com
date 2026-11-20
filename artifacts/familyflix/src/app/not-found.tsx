import { MyListProvider } from "@/components/familyflix/my-list-provider";
import { SiteFooter } from "@/components/familyflix/footer";
import { SiteHeader } from "@/components/familyflix/site-header";
import { NotFoundContent } from "@/components/familyflix/not-found-content";

export default function NotFound() {
  return (
    <MyListProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <NotFoundContent />
        </main>
        <SiteFooter />
      </div>
    </MyListProvider>
  );
}
