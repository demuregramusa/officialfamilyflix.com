import { Lock, ShieldCheck, Users } from "lucide-react";

import { StaffManager } from "@/components/admin/staff-manager";
import { requireStaffPage } from "@/lib/admin-auth";
import {
  MODERATOR_RESTRICTIONS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/admin/permissions";
import { listStaff } from "@/lib/admin/staff";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await requireStaffPage("staff.manage");
  const staff = await listStaff();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
          Access control
        </p>
        <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
          Staff &amp; moderators
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
          Create accounts, change roles, suspend access and review what each role can
          do. Only administrators can reach this page.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <ShieldCheck className="size-4 text-emerald-300" aria-hidden />
            {ROLE_LABELS.admin}
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
            {ROLE_DESCRIPTIONS.admin}
          </p>
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Users className="size-4 text-amber-300" aria-hidden />
            {ROLE_LABELS.moderator}
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
            {ROLE_DESCRIPTIONS.moderator}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Lock className="size-4 text-white/50" aria-hidden />
            Moderator restrictions
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">
            Enforced on the server for every request, not just hidden in the interface.
          </p>
        </div>
        <ul className="grid gap-px bg-white/[0.05] sm:grid-cols-2">
          {MODERATOR_RESTRICTIONS.map((item) => (
            <li key={item.label} className="bg-[#0a0712] px-4 py-3">
              <p className="text-[12px] font-medium text-white/80">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <StaffManager initial={staff} currentUserId={session.user.id} />
    </div>
  );
}
