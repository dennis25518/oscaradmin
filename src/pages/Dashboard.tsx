import { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import {
  FiBox,
  FiShoppingCart,
  FiHeart,
  FiDollarSign,
  FiUsers,
  FiMessageSquare,
  FiHelpCircle,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Stats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalDonations: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  body: string;
  created_at: string;
}

interface Question {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, any> = {
  completed: FiCheckCircle,
  delivered: FiCheckCircle,
  cancelled: FiAlertCircle,
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalDonations: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<
    { date: string; revenue: number; orders: number }[]
  >([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [ordersRes, productsRes, usersRes, donationsRes, reviewsRes, questionsRes] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id, order_number, total, status, created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(500),
          supabase.from("products").select("id", { count: "exact" }).limit(1),
          supabase.from("profiles").select("id", { count: "exact" }).limit(1),
          supabase.from("sadaka").select("id", { count: "exact" }).limit(1),
          supabase
            .from("product_comments")
            .select("id, user_name, rating, body, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("maswali")
            .select("id, name, email, message, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      if (ordersRes.error) console.error("orders:", ordersRes.error.message);
      if (donationsRes.error) console.error("sadaka:", donationsRes.error.message);

      const allOrders = ordersRes.data ?? [];
      const totalOrders = ordersRes.count ?? 0;
      const totalProducts = productsRes.count ?? 0;
      const totalUsers = usersRes.count ?? 0;
      const totalDonations = donationsRes.count ?? 0;

      const pendingOrders = allOrders.filter(
        (o: any) => (o.status ?? "").toLowerCase() === "pending"
      ).length;
      const completedOrders = allOrders.filter(
        (o: any) =>
          ["completed", "delivered"].includes((o.status ?? "").toLowerCase())
      ).length;
      const totalRevenue = allOrders.reduce(
        (sum: number, o: any) => sum + Number(o.total ?? 0),
        0
      );
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalProducts,
        totalUsers,
        totalDonations,
        totalRevenue,
        pendingOrders,
        completedOrders,
        averageOrderValue,
      });

      setRecentOrders(
        allOrders.slice(0, 8).map((o: any) => ({
          id: String(o.id),
          order_number:
            o.order_number ?? `#${String(o.id).slice(0, 8)}`,
          total: Number(o.total ?? 0),
          status: o.status ?? "pending",
          created_at: o.created_at ?? "",
        }))
      );

      // Build last-30-day chart from fetched data
      const points: { date: string; revenue: number; orders: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayOrders = allOrders.filter((o: any) =>
          (o.created_at ?? "").startsWith(key)
        );
        points.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: dayOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
          orders: dayOrders.length,
        });
      }
      setChartData(points);

      setReviews(
        (reviewsRes.data ?? []).map((r: any) => ({
          id: r.id,
          user_name: r.user_name ?? "Anonymous",
          rating: Number(r.rating ?? 5),
          body: r.body ?? "",
          created_at: r.created_at ?? "",
        }))
      );

      setQuestions(
        (questionsRes.data ?? []).map((q: any) => ({
          id: q.id,
          name: q.name ?? "Anonymous",
          email: q.email ?? "",
          message: q.message ?? "",
          created_at: q.created_at ?? "",
        }))
      );
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function statusColor(s: string) {
    return STATUS_COLOR[s.toLowerCase()] ?? "bg-gray-100 text-gray-600";
  }

  function StatusIcon({ status }: { status: string }) {
    const Icon = STATUS_ICON[status.toLowerCase()] ?? FiClock;
    return <Icon size={16} />;
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    sub,
  }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    sub?: string;
  }) => (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color} text-white`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-gray-400">
        <FiRefreshCw className="animate-spin text-3xl" />
        <p className="text-sm">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Business overview</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted transition"
        >
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={FiShoppingCart}
          label="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          color="bg-blue-500"
          sub={`${stats.completedOrders} completed`}
        />
        <StatCard
          icon={FiBox}
          label="Products"
          value={stats.totalProducts.toLocaleString()}
          color="bg-purple-500"
        />
        <StatCard
          icon={FiUsers}
          label="Users"
          value={stats.totalUsers.toLocaleString()}
          color="bg-emerald-500"
        />
        <StatCard
          icon={FiHeart}
          label="Donations"
          value={stats.totalDonations.toLocaleString()}
          color="bg-rose-500"
        />
        <StatCard
          icon={FiDollarSign}
          label="Revenue"
          value={formatTZS(stats.totalRevenue)}
          color="bg-amber-500"
          sub={`Avg: ${formatTZS(stats.averageOrderValue)}`}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Orders</p>
              <p className="mt-1 text-3xl font-bold">{stats.pendingOrders}</p>
            </div>
            <FiClock size={30} className="opacity-40" />
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Completed Orders</p>
              <p className="mt-1 text-3xl font-bold">{stats.completedOrders}</p>
            </div>
            <FiCheckCircle size={30} className="opacity-40" />
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Avg Order Value</p>
              <p className="mt-1 text-2xl font-bold">{formatTZS(stats.averageOrderValue)}</p>
            </div>
            <FiTrendingUp size={30} className="opacity-40" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Revenue & Orders — Last 30 Days
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" fontSize={11} tick={{ fill: "#9ca3af" }} />
            <YAxis yAxisId="left" fontSize={11} tick={{ fill: "#9ca3af" }} />
            <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(value: any, name: string) =>
                name === "Revenue (TZS)" ? [formatTZS(value), name] : [value, name]
              }
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Revenue (TZS)"
              stroke="#8B5CF6"
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="#06B6D4"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders + Reviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiShoppingCart size={18} className="text-blue-500" />
              Recent Orders
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No orders yet</p>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatTZS(o.total)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                    <StatusIcon status={o.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiMessageSquare size={18} className="text-amber-500" />
              Recent Reviews
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {reviews.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No reviews yet</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.user_name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < r.rating ? "text-amber-400" : "text-gray-200"}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{r.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FiHelpCircle size={18} className="text-blue-500" />
            Recent Messages (Maswali)
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No messages yet</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{q.name}</p>
                    <p className="text-xs text-gray-400">{q.email}</p>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{q.message}</p>
                  </div>
                  <p className="shrink-0 text-xs text-gray-400">
                    {new Date(q.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
