import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Zap,
  Sparkles,
  Layers,
  Download,
  ShieldCheck,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  productId: string;
  productType: "movies_api" | "ai_api" | "bundle";
  planCode: string;
  name: string;
  description: string;
  billingInterval: "month" | "year";
  priceCents: number;
  monthlyCreditQuotaCents: number;
  monthlyRequestQuota: number;
  rateLimitRpm: number;
  features: string[];
}

interface SubscriptionItem {
  id: string;
  planId: string;
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: string;
  planName?: string;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export function DeveloperBilling() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [activeProductTab, setActiveProductTab] = useState<"movies_api" | "ai_api" | "bundle">("bundle");
  const [loading, setLoading] = useState(true);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes, invRes] = await Promise.all([
        fetch("/api/dev/plans"),
        fetch("/api/dev/subscriptions"),
        fetch("/api/dev/invoices"),
      ]);

      if (plansRes.ok) {
        const pData = await plansRes.json();
        setPlans(Array.isArray(pData) ? pData : []);
      }
      if (subsRes.ok) {
        const sData = await subsRes.json();
        setSubscriptions(Array.isArray(sData) ? sData : []);
      }
      if (invRes.ok) {
        const iData = await invRes.json();
        setInvoices(Array.isArray(iData) ? iData : []);
      }
    } catch (err) {
      console.error("Failed to load developer billing:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (plan: PlanItem) => {
    try {
      setSubscribingPlanId(plan.id);
      setSuccessMsg(null);
      const res = await fetch("/api/dev/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      if (res.ok) {
        setSuccessMsg(`Successfully activated ${plan.name} plan!`);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Failed to subscribe:", err);
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const filteredPlans = plans.filter(
    (p) => p.productType === activeProductTab && p.billingInterval === billingCycle
  );

  const activePlanIds = new Set(subscriptions.map((s) => s.planId));

  return (
    <div className="min-h-screen bg-[#0c1014] text-white">
      <DeveloperNav activeTab="billing & plans" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pb-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CreditCard size={24} className="text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Plans & Subscriptions
            </h1>
          </div>
          <p className="mt-1 text-sm text-white/60">
            Scale seamlessly from startup prototypes to enterprise high-throughput distribution.
          </p>
        </div>

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3 text-xs text-emerald-200">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Product Tabs & Cycle Toggle */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex rounded-xl border border-white/10 bg-[#110c22] p-1">
            {[
              { id: "bundle", label: "Full Bundle (Movies + AI)", icon: Zap },
              { id: "movies_api", label: "Movies API Only", icon: Layers },
              { id: "ai_api", label: "AI API Only", icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeProductTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProductTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition",
                    active
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Billing Cycle Switch */}
          <div className="flex items-center gap-2 self-start md:self-auto rounded-xl border border-white/10 bg-[#110c22] p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("month")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                billingCycle === "month"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("year")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                billingCycle === "year"
                  ? "bg-purple-600 text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              <span>Yearly</span>
              <span className="rounded bg-amber-400 px-1 py-0.2 text-[9px] font-black uppercase text-black">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {filteredPlans.map((plan) => {
            const isSubscribed = activePlanIds.has(plan.id);
            const isPopular = plan.planCode.includes("pro");
            const price = (plan.priceCents / 100).toFixed(0);

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-6 transition backdrop-blur-sm",
                  isPopular
                    ? "border-purple-500/60 bg-gradient-to-b from-[#1c1236]/90 to-[#100a20]/90 shadow-xl shadow-purple-950/40"
                    : "border-white/10 bg-[#110c22]/60 hover:border-white/20"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {isSubscribed && (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/40">
                        Active Plan
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-white/60 min-h-[32px]">{plan.description}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${price}</span>
                    <span className="text-xs text-white/50">
                      /{billingCycle === "month" ? "mo" : "yr"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between text-white/70">
                      <span>Monthly Credit Quota:</span>
                      <strong className="text-white">${plan.monthlyCreditQuotaCents / 100} USD</strong>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Rate Limit:</span>
                      <strong className="text-white">{plan.rateLimitRpm} RPM</strong>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Plan Inclusions
                    </div>
                    {plan.features?.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/80">
                        <Check size={14} className="shrink-0 text-purple-400 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribed || subscribingPlanId === plan.id}
                    className={cn(
                      "w-full rounded-xl py-2.5 text-xs font-bold transition shadow-md",
                      isSubscribed
                        ? "bg-white/10 text-white/50 cursor-default"
                        : isPopular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110"
                        : "bg-white/15 text-white hover:bg-white/20"
                    )}
                  >
                    {isSubscribed
                      ? "Current Active Tier"
                      : subscribingPlanId === plan.id
                      ? "Activating..."
                      : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Invoices & Billing History */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              <h2 className="font-bold text-base text-white">Billing History & Invoices</h2>
            </div>
            <span className="text-xs text-white/50">Automated receipts</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Invoice ID</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="py-3 text-white/60">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-semibold text-white">
                        ${(inv.amountCents / 100).toFixed(2)} USD
                      </td>
                      <td className="py-3">
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300 border border-emerald-500/30">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => alert(`Downloading PDF invoice ${inv.invoiceNumber}`)}
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40">
                      No invoices generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
