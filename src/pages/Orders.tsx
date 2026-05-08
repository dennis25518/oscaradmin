import { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { FiSearch } from "react-icons/fi";

interface ShippingAddress {
  label?: string;
  address_line_1?: string;
  city?: string;
}

interface Order {
  id: string;
  order_number?: string;
  status: string;
  subtotal?: number;
  delivery_fee?: number;
  discount_amount?: number;
  total_amount?: number;
  payment_status?: string;
  currency?: string;
  notes?: string;
  created_at?: string;
  user_id?: string;
  shipping_address?: ShippingAddress | null;
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
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, payment_status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Error fetching orders:", error.message, error.details);
        setOrders([]);
        return;
      }

      const normalized = (data ?? []).map((item: any) => ({
        id: item.id,
        order_number: item.order_number,
        status: item.status ?? "pending",
        subtotal: 0,
        delivery_fee: 0,
        discount_amount: 0,
        total_amount: Number(item.total_amount ?? 0),
        payment_status: item.payment_status ?? "unpaid",
        currency: "TZS",
        notes: "",
        created_at: item.created_at ?? new Date().toISOString(),
        user_id: item.user_id ?? "",
        shipping_address: null,
      } as Order));

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

  async function updateStatus(id: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = orders.filter(
    (o) =>
      (o.order_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.shipping_address?.address_line_1 ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (o.shipping_address?.city ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Orders</h2>

      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders…"
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">
                    {o.order_number ?? o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(o.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {o.shipping_address
                      ? `${o.shipping_address.address_line_1}, ${o.shipping_address.city}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatTZS(o.total_amount ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : o.payment_status === "refunded" ? "bg-orange-100 text-orange-700" : o.payment_status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                      {o.payment_status ?? "unpaid"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
