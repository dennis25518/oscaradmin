import { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { FiHeart } from "react-icons/fi";

interface Donation {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  donor_name: string;
  donor_email: string;
  payment_method: string;
  status: string;
  cause: string;
  message: string;
}

export default function Donations() {
  const [rows, setRows] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("donations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("Error fetching donations:", error.message, error.details);
          setRows([]);
          setLoading(false);
          return;
        }

        const donations = data ?? [];
        setRows(donations as Donation[]);
        setTotal(
          donations.reduce(
            (s, d: Record<string, unknown>) => s + ((d.amount as number) ?? 0),
            0,
          ),
        );
      } catch (err) {
        console.error("Error loading donations:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Donations</h2>

      {/* Summary card */}
      <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500 text-white">
          <FiHeart size={22} />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Donations</p>
          <p className="text-2xl font-bold">{formatTZS(total)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Donor</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Cause</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Method</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No donations yet.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(d.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {d.donor_name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.donor_email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.cause ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatTZS(d.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {d.payment_method ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                      {d.status ?? "pending"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
