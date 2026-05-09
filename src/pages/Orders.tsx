import React, { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { FiSearch, FiRefreshCw } from "react-icons/fi";

interface OrderItem {
  name?: string;
  price?: number;
  quantity?: number;
}

interface Order {
  id: string;
  order_number?: string;
  status: string;
  total: number;
  items?: OrderItem[];
  created_at?: string;
  user_id?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching orders:", error.message);
        setOrders([]);
        return;
      }

      const normalized: Order[] = (data ?? []).map((item: any) => ({
        id: item.id,
        order_number: item.order_number ?? null,
        status: item.status ?? "pending",
        total: Number(item.total ?? 0),
        items: Array.isArray(item.items) ? item.items : [],
        created_at: item.created_at ?? new Date().toISOString(),
        user_id: item.user_id ?? "",
      }));

      setOrders(normalized);
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (o.order_number ?? "").toLowerCase().includes(q) ||
      (o.user_id ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Orders</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length },
          { label: "Filtered", value: filtered.length },
          {
            label: "Pending",
            value: orders.filter((o) => o.status === "pending").length,
          },
          { label: "Revenue (filtered)", value: formatTZS(totalRevenue) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order # or user..."
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  <FiRefreshCw className="mx-auto mb-2 animate-spin text-2xl" />
                  Loading orders...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <React.Fragment key={o.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === o.id ? null : o.id)
                    }
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium text-primary">
                      {o.order_number ?? `#${o.id.slice(0, 8)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(o.created_at!).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatTZS(o.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>

                  {expandedId === o.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                              Order Info
                            </p>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p>
                                <span className="text-gray-400">ID: </span>
                                {o.id}
                              </p>
                              <p>
                                <span className="text-gray-400">User: </span>
                                {o.user_id || "unknown"}
                              </p>
                              <div className="flex justify-between border-t pt-1 font-semibold">
                                <span>Total</span>
                                <span>{formatTZS(o.total)}</span>
                              </div>
                            </div>
                          </div>
                          {(o.items ?? []).length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                                Items ({o.items!.length})
                              </p>
                              <div className="space-y-1 text-sm">
                                {o.items!.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between"
                                  >
                                    <span className="text-gray-700 truncate max-w-[200px]">
                                      {item.name ?? "Product"}{" "}
                                      <span className="text-gray-400">
                                        x{item.quantity ?? 1}
                                      </span>
                                    </span>
                                    <span>
                                      {formatTZS(
                                        (item.price ?? 0) *
                                          (item.quantity ?? 1),
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <p className="text-right text-xs text-gray-400">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
