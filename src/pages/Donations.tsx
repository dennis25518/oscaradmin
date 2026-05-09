import React, { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { FiHeart, FiRefreshCw, FiSearch } from "react-icons/fi";

interface Donation {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  donor_name: string;
  status: string;
  message: string;
  user_id: string | null;
}

interface NetworkSummary {
  network_name?: string;
  total_amount?: number;
  [key: string]: any;
}

interface MonthlySummary {
  month?: string;
  total_amount?: number;
  currency?: string;
  [key: string]: any;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

type Tab = "all" | "network" | "monthly";

export default function Donations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [networkData, setNetworkData] = useState<NetworkSummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  async function load() {
    setLoading(true);
    try {
      const [sadakaRes, networkRes, monthlyRes] = await Promise.all([
        supabase
          .from("sadaka")
          .select("id, created_at, amount, currency, donor_name, status, message, user_id")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("sadaka_by_network").select("*"),
        supabase.from("sadaka_monthly_summary").select("*").order("month", { ascending: false }),
      ]);

      if (sadakaRes.error) console.error("sadaka:", sadakaRes.error.message);
      if (networkRes.error) console.error("sadaka_by_network:", networkRes.error.message);
      if (monthlyRes.error) console.error("sadaka_monthly_summary:", monthlyRes.error.message);

      setDonations(
        (sadakaRes.data ?? []).map((d: any) => ({
          id: d.id,
          created_at: d.created_at ?? "",
          amount: Number(d.amount ?? 0),
          currency: d.currency ?? "TZS",
          donor_name: d.donor_name ?? "",
          status: d.status ?? "pending",
          message: d.message ?? "",
          user_id: d.user_id ?? null,
        }))
      );
      setNetworkData(networkRes.data ?? []);
      setMonthlyData(monthlyRes.data ?? []);
    } catch (err) {
      console.error("Error loading donations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = donations.filter((d) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (d.donor_name ?? "").toLowerCase().includes(q) ||
      (d.status ?? "").toLowerCase().includes(q) ||
      (d.message ?? "").toLowerCase().includes(q)
    );
  });

  const totalAmount = donations.reduce((s, d) => s + d.amount, 0);
  const completedCount = donations.filter((d) => d.status === "completed").length;
  const registeredCount = donations.filter((d) => !!d.user_id).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `All Donations (${donations.length})` },
    { key: "network", label: `By Network` },
    { key: "monthly", label: `Monthly Summary` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Donations</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Donations",
            value: formatTZS(totalAmount),
            icon: <FiHeart className="text-rose-500" />,
          },
          { label: "Total Records", value: donations.length },
          { label: "Completed", value: completedCount },
          { label: "Registered Users", value: registeredCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{s.label}</p>
              {s.icon}
            </div>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-primary text-white"
                : "bg-white text-gray-600 hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All donations tab */}
      {tab === "all" && (
        <>
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by donor, status, message..."
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <FiRefreshCw className="mx-auto mb-2 animate-spin text-2xl" />
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No donations yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{d.donor_name || <span className="italic text-gray-400">Anonymous</span>}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.user_id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {d.user_id ? "Registered" : "Guest"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {d.message || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatTZS(d.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <p className="text-right text-xs text-gray-400">
              Showing {filtered.length} of {donations.length} donations
            </p>
          )}
        </>
      )}

      {/* By network tab */}
      {tab === "network" && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
              <tr>
                {networkData.length > 0
                  ? Object.keys(networkData[0]).map((col) => (
                      <th key={col} className="px-4 py-3 capitalize">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))
                  : <th className="px-4 py-3">Network</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : networkData.length === 0 ? (
                <tr><td className="py-12 text-center text-gray-400">No network data yet.</td></tr>
              ) : (
                networkData.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                    {Object.entries(row).map(([col, val]) => (
                      <td key={col} className="px-4 py-3">
                        {col.includes("amount") ? formatTZS(Number(val ?? 0)) : String(val ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly summary tab */}
      {tab === "monthly" && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
              <tr>
                {monthlyData.length > 0
                  ? Object.keys(monthlyData[0]).map((col) => (
                      <th key={col} className="px-4 py-3 capitalize">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))
                  : <><th className="px-4 py-3">Month</th><th className="px-4 py-3 text-right">Total</th></>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-12 text-center text-gray-400" colSpan={3}>Loading...</td></tr>
              ) : monthlyData.length === 0 ? (
                <tr><td className="py-12 text-center text-gray-400" colSpan={3}>No monthly data yet.</td></tr>
              ) : (
                monthlyData.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                    {Object.entries(row).map(([col, val]) => (
                      <td key={col} className={`px-4 py-3 ${col.includes("amount") ? "text-right font-semibold" : ""}`}>
                        {col.includes("amount") ? formatTZS(Number(val ?? 0)) : String(val ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
