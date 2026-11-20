import { FileText, ShieldCheck, UploadCloud } from "lucide-react";

import { ImportForm } from "@/components/admin/import-form";
import { requireStaffPage } from "@/lib/admin-auth";
import {
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  templateCsv,
  templateJson,
} from "@/lib/admin/import";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requireStaffPage("library.import");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/30">
            Catalog
          </p>
          <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">
            Import titles
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
            Bulk-import your own licensed catalog from CSV or JSON. Imported titles
            publish immediately with their rights confirmed and are audited.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60">
          <ShieldCheck className="size-3.5" aria-hidden />
          Administrator only
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <ImportForm
          columns={IMPORT_COLUMNS}
          template={templateCsv()}
          jsonTemplate={templateJson()}
        />

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <UploadCloud className="size-4 text-white/50" aria-hidden />
                Required columns
              </h2>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {IMPORT_COLUMNS.filter((column) => column.required).map((column) => (
                <li key={column.name} className="px-4 py-2.5">
                  <p className="font-mono text-[11.5px] text-white/80">{column.name}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
                    {column.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <FileText className="size-4 text-white/50" aria-hidden />
                Limits
              </h2>
            </div>
            <ul className="space-y-2 px-4 py-3 text-[11.5px] leading-relaxed text-white/45">
              <li>Up to {IMPORT_LIMITS.maxRows.toLocaleString()} titles per import.</li>
              <li>File or paste up to 5 MB.</li>
              <li>The first {IMPORT_LIMITS.maxIssues} problems are listed.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
