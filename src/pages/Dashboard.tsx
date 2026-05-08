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
} from "react-icons/fi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardStats {
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
  total_amount: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface TopProduct {
  id: string;
  name: string;
  sales_count: number;
  revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
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
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [chartData, setChartData] = useState<
    { date: string; revenue: number; orders: number }[]
  >([]);
  const [donationChart, setDonationChart] = useState<
    { name: string; amount: number }[]
  >([]);
  const [recentReviews, setRecentReviews] = useState<
    { id: string; name: string; rating: number; comment: string }[]
  >([]);
  const [recentQuestions, setRecentQuestions] = useState<
    { id: string; name: string; email: string; question: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Fetch all key metrics in parallel
      const [
        ordersRes,
        productsRes,
        usersRes,
        donationsRes,
        recentOrdersRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, status, created_at", { count: "exact" }),
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("donations").select("id, amount", { count: "exact" }),
        supabase
          .from("orders")
          .select("id, order_number, total_amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const totalOrders = ordersRes.count ?? 0;
      const totalProducts = productsRes.count ?? 0;
      const totalUsers = usersRes.count ?? 0;
      const totalDonations = donationsRes.count ?? 0;
      const allOrders = ordersRes.data ?? [];
      const allDonations = donationsRes.data ?? [];

      // Calculate order statistics
      const pendingOrders = allOrders.filter(
        (o) => (o.status ?? "").toLowerCase() === "pending"
      ).length;
      const completedOrders = allOrders.filter(
        (o) => (o.status ?? "").toLowerCase() === "completed"
      ).length;

      // Calculate totals
      const totalRevenue = allOrders.reduce(
        (sum, o) => sum + ((o.total_amount as number) ?? 0),
        0
      );
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

      // Format recent orders
      setRecentOrders(
        (recentOrdersRes.data ?? []).map((o) => ({
          id: o.id as string,
          order_number: (o.order_number as string) ?? `#${(o.id as string).slice(0, 8)}`,
          total_amount: (o.total_amount as number) ?? 0,
          status: (o.status as string) ?? "pending",
          created_at: (o.created_at as string) ?? "",
        }))
      );

      // Generate chart data
      const chartPoints = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayOrders = allOrders.filter(
          (o) => (o.created_at as string)?.startsWith(dateStr)
        );
        const dayRevenue = dayOrders.reduce(
          (sum, o) => sum + ((o.total_amount as number) ?? 0),
          0
        );
        chartPoints.push({
          date: new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          revenue: Math.round(dayRevenue),
          orders: dayOrders.length,
        });
      }
      setChartData(chartPoints);

      // Generate donation chart
      const donationByType = [
        {
          name: "Cash Donations",
          amount: allDonations.reduce(
            (sum, d) => sum + ((d.amount as number) ?? 0),
            0
          ),
        },
        { name: "Product Donations", amount: Math.round(totalRevenue * 0.05) },
      ];
      setDonationChart(donationByType);

      // Fetch top products
      const { data: productsData } = await supabase
        .from("orders")
        .select("order_items(product_id, quantity, price)")
        .limit(100);

      const productMap = new Map<
        string,
        { sales: number; revenue: number }
      >();
      (productsData ?? []).forEach((order: any) => {
        (order.order_items ?? []).forEach(
          (item: {
            product_id: string;
            quantity: number;
            price: number;
          }) => {
            if (item.product_id) {
              const current = productMap.get(item.product_id) || {
                sales: 0,
                revenue: 0,
              };
              current.sales += item.quantity ?? 0;
              current.revenue += (item.price ?? 0) * (item.quantity ?? 0);
              productMap.set(item.product_id, current);
            }
          }
        );
      });

      const topProductsList: TopProduct[] = [];
      for (const [productId, data] of Array.from(productMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)) {
        const { data: product } = await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .single();
        if (product) {
          topProductsList.push({
            id: productId,
            name: product.name as string,
            sales_count: data.sales,
            revenue: data.revenue,
          });
        }
      }
      setTopProducts(topProductsList);

      // Fetch reviews/comments if table exists
      try {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("id, name, rating, comment")
          .order("created_at", { ascending: false })
          .limit(5);
        if (reviews) {
          setRecentReviews(
            reviews.map((r: any) => ({
              id: r.id,
              name: r.name ?? "Anonymous",
              rating: r.rating ?? 5,
              comment: r.comment ?? "",
            }))
          );
        }
      } catch {
        // Reviews table might not exist
      }

      // Fetch questions if table exists
      try {
        const { data: questions } = await supabase
          .from("contact_messages")
          .select("id, name, email, message")
          .order("created_at", { ascending: false })
          .limit(5);
        if (questions) {
          setRecentQuestions(
            questions.map((q: any) => ({
              id: q.id,
              name: q.name ?? "Anonymous",
              email: q.email ?? "",
              question: q.message ?? "",
            }))
          );
        }
      } catch {
        // Contact messages table might not exist
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "delivered")
      return "bg-emerald-100 text-emerald-700";
    if (s === "pending" || s === "processing")
      return "bg-amber-100 text-amber-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "delivered") return FiCheckCircle;
    if (s === "cancelled") return FiAlertCircle;
    return FiClock;
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    subtext,
  }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    subtext?: string;
  }) => (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="mt-1 text-xs text-gray-500">{subtext}</p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${color} text-white`}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={FiShoppingCart}
          label="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          color="bg-blue-500"
          subtext={`${stats.completedOrders} completed`}
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
          subtext={`Avg: ${formatTZS(stats.averageOrderValue)}`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Orders</p>
              <p className="mt-2 text-3xl font-bold">
                {stats.pendingOrders}
              </p>
            </div>
            <FiClock size={32} className="opacity-50" />
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Completed Orders</p>
              <p className="mt-2 text-3xl font-bold">
                {stats.completedOrders}
              </p>
            </div>
            <FiCheckCircle size={32} className="opacity-50" />
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Avg Order Value</p>
              <p className="mt-2 text-2xl font-bold">
                {formatTZS(stats.averageOrderValue)}
              </p>
            </div>
            <FiTrendingUp size={32} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue & Orders Trend */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Revenue & Orders (Last 30 Days)
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(value: any, name: string) => {
                    if (name === "revenue") return [formatTZS(value), "Revenue"];
                    return [value, "Orders"];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  dot={false}
                  strokeWidth={2}
                  name="Revenue (TZS)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#06B6D4"
                  dot={false}
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Donations Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Donation Overview
          </h3>
          {donationChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={donationChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(value: any) => formatTZS(value)}
                />
                <Bar dataKey="amount" fill="#EC4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center text-gray-400">
              No donation data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiShoppingCart size={20} className="text-blue-500" />
              Recent Orders
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                return (
                  <div key={order.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {order.order_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatTZS(order.total_amount)}
                        </p>
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <StatusIcon size={18} className="text-gray-400" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No orders yet
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiTrendingUp size={20} className="text-emerald-500" />
              Top Products
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {topProducts.length > 0 ? (
              topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.sales_count} sales
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatTZS(product.revenue)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No product sales yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Questions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reviews */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiMessageSquare size={20} className="text-amber-500" />
              Recent Reviews
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{review.name}</p>
                      <div className="mt-1 flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating
                                ? "text-amber-400"
                                : "text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No reviews yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Questions */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiHelpCircle size={20} className="text-blue-500" />
              Recent Questions
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recentQuestions.length > 0 ? (
              recentQuestions.map((q) => (
                <div key={q.id} className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{q.name}</p>
                    <p className="text-xs text-gray-500">{q.email}</p>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {q.question}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No questions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
