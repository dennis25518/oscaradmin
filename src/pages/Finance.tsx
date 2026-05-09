import { useEffect, useMemo, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  FiDollarSign,
  FiShoppingCart,
  FiHeart,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiDownload,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiSend,
  FiX,
  FiArrowDownLeft,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  user_id: string | null;
}

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

interface Transaction {
  id: string;
  type: "sale" | "donation";
  reference: string;
  party: string;
  amount: number;
  status: string;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  method: "mobile_money" | "bank";
  recipient_name: string;
  account_number: string;
  bank_name: string | null;
  bic: string | null;
  network: string | null;
  transfer_type: string | null;
  status: string;
  clickpesa_ref: string | null;
  order_reference: string;
  notes: string | null;
  created_at: string;
}

type DateRange = "7d" | "30d" | "90d" | "all";
type Tab = "all" | "sales" | "donations";
type WithdrawMethod = "mobile_money" | "bank";

// ─── Static data ──────────────────────────────────────────────────────────────

const TZ_BANKS = [
  { name: "CRDB Bank", bic: "CORUTZTZ" },
  { name: "NMB Bank", bic: "NMIBTZTZ" },
  { name: "NBC Bank", bic: "NLCBTZTX" },
  { name: "Stanbic Bank Tanzania", bic: "SBICTZTZ" },
  { name: "Equity Bank Tanzania", bic: "EQBLTZTZ" },
  { name: "Standard Chartered Bank Tanzania", bic: "SCBLTZTZ" },
  { name: "Absa Bank Tanzania", bic: "BARCTZTZ" },
  { name: "Exim Bank Tanzania", bic: "EXTNTZTZ" },
  { name: "Bank of Africa Tanzania", bic: "AFRITZTZ" },
  { name: "Access Bank Tanzania", bic: "ABNGTZTZ" },
  { name: "Azania Bank", bic: "AZANTZTZ" },
];

const MNO_NETWORKS = [
  { label: "Vodacom M-Pesa", value: "MPESA TANZANIA" },
  { label: "Tigo Pesa", value: "TIGO TANZANIA" },
  { label: "Airtel Money", value: "AIRTEL TANZANIA" },
  { label: "Halopesa (Halotel)", value: "HALOTEL TANZANIA" },
];

const WD_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  success: "bg-emerald-100 text-emerald-700",
  authorized: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  reversed: "bg-red-100 text-red-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPLETED_SALE = new Set(["delivered", "completed"]);
const COMPLETED_DON = new Set(["completed", "success", "paid"]);

function isCompletedSale(s: string) {
  return COMPLETED_SALE.has(s.toLowerCase());
}
function isCompletedDon(s: string) {
  return COMPLETED_DON.has(s.toLowerCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function cutoffDate(range: DateRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(range));
  return d;
}

function txStatusBadge(s: string, type: "sale" | "donation") {
  const lower = s.toLowerCase();
  const completed =
    type === "sale" ? isCompletedSale(lower) : isCompletedDon(lower);
  if (completed) return "bg-emerald-100 text-emerald-700";
  if (lower === "pending") return "bg-amber-100 text-amber-700";
  if (["failed", "cancelled", "refunded"].includes(lower))
    return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function genOrderRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WD${ts}${rand}`;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-lg text-sm">
      <p className="mb-2 font-semibold text-gray-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatTZS(p.value)}
        </p>
      ))}
    </div>
  );
}

function buildMonthlyChart(orders: Order[], donations: Donation[]) {
  const map: Record<
    string,
    { month: string; sales: number; donations: number }
  > = {};
  const addMonth = (iso: string) => {
    const d = new Date(iso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
    if (!map[key]) map[key] = { month: label, sales: 0, donations: 0 };
    return key;
  };
  orders.forEach((o) => {
    if (isCompletedSale(o.status)) {
      const k = addMonth(o.created_at);
      map[k].sales += o.total ?? 0;
    }
  });
  donations.forEach((d) => {
    if (isCompletedDon(d.status)) {
      const k = addMonth(d.created_at);
      map[k].donations += d.amount ?? 0;
    }
  });
  return Object.keys(map)
    .sort()
    .slice(-12)
    .map((k) => map[k]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Finance() {
  const { adminProfile } = useAuth();

  // Revenue data
  const [orders, setOrders] = useState<Order[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal data
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWd, setLoadingWd] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wdError, setWdError] = useState<string | null>(null);

  // Withdrawal form state
  const [wdMethod, setWdMethod] = useState<WithdrawMethod>("mobile_money");
  const [wdAmount, setWdAmount] = useState("");
  const [wdRecipientName, setWdRecipientName] = useState("");
  const [wdPhone, setWdPhone] = useState("");
  const [wdNetwork, setWdNetwork] = useState(MNO_NETWORKS[0].value);
  const [wdAccountNumber, setWdAccountNumber] = useState("");
  const [wdBankBic, setWdBankBic] = useState(TZ_BANKS[0].bic);
  const [wdTransferType, setWdTransferType] = useState<"ACH" | "RTGS">("ACH");

  // Table filters
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [oRes, dRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("sadaka")
          .select(
            "id, created_at, amount, currency, donor_name, status, message, user_id",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);
      if (oRes.error) throw new Error(`Orders: ${oRes.error.message}`);
      if (dRes.error) throw new Error(`Donations: ${dRes.error.message}`);
      setOrders(oRes.data ?? []);
      setDonations(dRes.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWithdrawals() {
    setLoadingWd(true);
    try {
      const { data, error: wErr } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!wErr) setWithdrawals(data ?? []);
    } finally {
      setLoadingWd(false);
    }
  }

  useEffect(() => {
    load();
    loadWithdrawals();
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const cutoff = useMemo(() => cutoffDate(dateRange), [dateRange]);

  const filteredOrders = useMemo(
    () =>
      cutoff ? orders.filter((o) => new Date(o.created_at) >= cutoff!) : orders,
    [orders, cutoff],
  );

  const filteredDonations = useMemo(
    () =>
      cutoff
        ? donations.filter((d) => new Date(d.created_at) >= cutoff!)
        : donations,
    [donations, cutoff],
  );

  const stats = useMemo(() => {
    const salesRevenue = filteredOrders
      .filter((o) => isCompletedSale(o.status))
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const donationRevenue = filteredDonations
      .filter((d) => isCompletedDon(d.status))
      .reduce((s, d) => s + (d.amount ?? 0), 0);
    const pendingSales = filteredOrders
      .filter((o) => o.status.toLowerCase() === "pending")
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const pendingDonations = filteredDonations
      .filter((d) => d.status.toLowerCase() === "pending")
      .reduce((s, d) => s + (d.amount ?? 0), 0);
    const completedSales = filteredOrders.filter((o) =>
      isCompletedSale(o.status),
    );
    return {
      totalRevenue: salesRevenue + donationRevenue,
      salesRevenue,
      donationRevenue,
      pendingAmount: pendingSales + pendingDonations,
      avgOrderValue: completedSales.length
        ? salesRevenue / completedSales.length
        : 0,
      totalOrders: filteredOrders.length,
      totalDonations: filteredDonations.length,
      completedOrdersCount: completedSales.length,
    };
  }, [filteredOrders, filteredDonations]);

  const totalWithdrawn = useMemo(
    () =>
      withdrawals
        .filter((w) =>
          ["completed", "success", "authorized"].includes(
            w.status.toLowerCase(),
          ),
        )
        .reduce((s, w) => s + w.amount, 0),
    [withdrawals],
  );

  const availableBalance = useMemo(
    () => Math.max(0, stats.totalRevenue - totalWithdrawn),
    [stats.totalRevenue, totalWithdrawn],
  );

  const chartData = useMemo(
    () => buildMonthlyChart(filteredOrders, filteredDonations),
    [filteredOrders, filteredDonations],
  );

  const transactions = useMemo<Transaction[]>(() => {
    const saleTx: Transaction[] = filteredOrders.map((o) => ({
      id: o.id,
      type: "sale",
      reference: o.order_number || `ORD-${o.id.slice(0, 6).toUpperCase()}`,
      party: o.user_id ? `Customer (${o.user_id.slice(0, 8)}…)` : "Guest",
      amount: o.total ?? 0,
      status: o.status,
      created_at: o.created_at,
    }));
    const donTx: Transaction[] = filteredDonations.map((d) => ({
      id: d.id,
      type: "donation",
      reference: `DON-${d.id.slice(0, 6).toUpperCase()}`,
      party: d.donor_name || (d.user_id ? "Registered User" : "Anonymous"),
      amount: d.amount ?? 0,
      status: d.status,
      created_at: d.created_at,
    }));
    return [...saleTx, ...donTx].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [filteredOrders, filteredDonations]);

  const displayed = useMemo(() => {
    let list = transactions;
    if (tab === "sales") list = list.filter((t) => t.type === "sale");
    if (tab === "donations") list = list.filter((t) => t.type === "donation");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.reference.toLowerCase().includes(q) ||
          t.party.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q),
      );
    }
    return list;
  }, [transactions, tab, search]);

  // ── Export ────────────────────────────────────────────────────────────────

  function exportCSV() {
    const header = "Type,Reference,Party,Amount (TZS),Status,Date\n";
    const rows = displayed
      .map(
        (t) =>
          `${t.type},${t.reference},"${t.party}",${t.amount},${t.status},${formatDate(t.created_at)}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oscar-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Withdrawal submit ─────────────────────────────────────────────────────

  function resetForm() {
    setWdAmount("");
    setWdRecipientName("");
    setWdPhone("");
    setWdNetwork(MNO_NETWORKS[0].value);
    setWdAccountNumber("");
    setWdBankBic(TZ_BANKS[0].bic);
    setWdTransferType("ACH");
    setWdMethod("mobile_money");
    setWdError(null);
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWdError(null);

    const amount = parseFloat(wdAmount);
    if (!amount || amount <= 0) {
      setWdError("Enter a valid amount.");
      return;
    }
    if (amount > availableBalance) {
      setWdError(`Exceeds available balance (${formatTZS(availableBalance)}).`);
      return;
    }
    if (amount < 1000) {
      setWdError("Minimum withdrawal is TZS 1,000.");
      return;
    }
    if (!wdRecipientName.trim()) {
      setWdError("Recipient name is required.");
      return;
    }

    if (wdMethod === "mobile_money") {
      const phoneClean = wdPhone.replace(/\s/g, "");
      if (!/^255\d{9}$/.test(phoneClean)) {
        setWdError(
          "Phone must start with 255 and be 12 digits (e.g. 255712345678).",
        );
        return;
      }
    } else {
      if (!wdAccountNumber.trim()) {
        setWdError("Account number is required.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderReference = genOrderRef();
      const selectedBank = TZ_BANKS.find((b) => b.bic === wdBankBic);

      // 1. Save to withdrawal_requests table
      const { error: dbErr } = await supabase
        .from("withdrawal_requests")
        .insert({
          amount,
          currency: "TZS",
          method: wdMethod,
          recipient_name: wdRecipientName.trim(),
          account_number:
            wdMethod === "mobile_money"
              ? wdPhone.replace(/\s/g, "")
              : wdAccountNumber.trim(),
          bank_name: wdMethod === "bank" ? (selectedBank?.name ?? null) : null,
          bic: wdMethod === "bank" ? wdBankBic : null,
          network: wdMethod === "mobile_money" ? wdNetwork : null,
          transfer_type: wdMethod === "bank" ? wdTransferType : null,
          status: "pending",
          order_reference: orderReference,
          admin_id: adminProfile?.id ?? null,
        });
      if (dbErr) throw new Error(`DB error (${dbErr.code}): ${dbErr.message}`);

      // 2. Invoke Supabase Edge Function → ClickPesa Payout API
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "clickpesa-payout",
        {
          body: {
            method: wdMethod,
            amount,
            orderReference,
            currency: "TZS",
            recipientName: wdRecipientName.trim(),
            ...(wdMethod === "mobile_money"
              ? { phoneNumber: wdPhone.replace(/\s/g, ""), network: wdNetwork }
              : {
                  accountNumber: wdAccountNumber.trim(),
                  accountName: wdRecipientName.trim(),
                  bic: wdBankBic,
                  transferType: wdTransferType,
                }),
          },
        },
      );

      if (fnErr) {
        // Edge function not yet deployed — record is saved for manual processing
        showToast(
          "success",
          `Withdrawal request saved (ref: ${orderReference}). Deploy the clickpesa-payout Edge Function to process automatically.`,
        );
      } else {
        const cpRef = fnData?.id ?? fnData?.orderReference ?? null;
        const cpStatus = (
          (fnData?.status as string) ?? "processing"
        ).toLowerCase();
        await supabase
          .from("withdrawal_requests")
          .update({ clickpesa_ref: cpRef, status: cpStatus })
          .eq("order_reference", orderReference);
        showToast(
          "success",
          `Withdrawal initiated! ClickPesa ref: ${cpRef ?? orderReference}`,
        );
      }

      setShowModal(false);
      resetForm();
      await loadWithdrawals();
    } catch (err: any) {
      setWdError(err.message ?? "Failed to submit withdrawal.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Retry pending withdrawal ──────────────────────────────────────────────

  async function retryWithdrawal(w: WithdrawalRequest) {
    try {
      await supabase
        .from("withdrawal_requests")
        .update({ status: "processing" })
        .eq("id", w.id);
      await loadWithdrawals();

      // Edge function always returns HTTP 200; check res.ok field for logic errors
      const { data: res } = await supabase.functions.invoke(
        "clickpesa-payout",
        {
          body: {
            method: w.method,
            amount: w.amount,
            orderReference: w.order_reference,
            currency: w.currency ?? "TZS",
            ...(w.method === "mobile_money"
              ? { phoneNumber: w.account_number, network: w.network }
              : {
                  accountNumber: w.account_number,
                  accountName: w.recipient_name,
                  bic: w.bic,
                  transferType: w.transfer_type,
                }),
          },
        },
      );

      if (!res?.ok) {
        // Revert to pending so user can retry later
        await supabase
          .from("withdrawal_requests")
          .update({ status: "failed" })
          .eq("id", w.id);
        const stage = res?.stage ? `[${res.stage}] ` : "";
        const detail = res?.clickpesaBody
          ? ` — ${JSON.stringify(res.clickpesaBody)}`
          : "";
        console.error("ClickPesa error body:", res?.clickpesaBody);
        showToast(
          "error",
          `${stage}${res?.error ?? "Unknown error from ClickPesa"}${detail}`,
        );
      } else {
        const cpData = res.data ?? {};
        const cpRef =
          cpData.id ?? cpData.orderReference ?? cpData.reference ?? null;
        const cpStatus = (cpData.status ?? "processing")
          .toString()
          .toLowerCase();
        await supabase
          .from("withdrawal_requests")
          .update({ clickpesa_ref: cpRef, status: cpStatus })
          .eq("id", w.id);
        showToast(
          "success",
          `Payout submitted! Ref: ${cpRef ?? w.order_reference} · Status: ${cpStatus}`,
        );
      }
    } catch (err: any) {
      showToast("error", err.message ?? "Retry failed.");
    } finally {
      await loadWithdrawals();
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";
  const labelCls = "mb-1.5 block text-xs font-medium text-gray-600";

  const statCards = [
    {
      label: "Total Revenue",
      val: formatTZS(stats.totalRevenue),
      sub: `${stats.totalOrders + stats.totalDonations} transactions`,
      icon: FiTrendingUp,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Sales Revenue",
      val: formatTZS(stats.salesRevenue),
      sub: `${stats.completedOrdersCount} completed orders`,
      icon: FiShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Donations Received",
      val: formatTZS(stats.donationRevenue),
      sub: `${stats.totalDonations} total donations`,
      icon: FiHeart,
      color: "bg-rose-100 text-rose-600",
    },
    {
      label: "Pending Payments",
      val: formatTZS(stats.pendingAmount),
      sub: "Awaiting ClickPesa confirmation",
      icon: FiClock,
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex max-w-sm items-start gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <FiCheckCircle className="mt-0.5 shrink-0" size={15} />
          ) : (
            <FiAlertCircle className="mt-0.5 shrink-0" size={15} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── Withdraw Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              resetForm();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-semibold">
                  Withdraw Funds via ClickPesa
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Available balance:{" "}
                  <span className="font-bold text-emerald-700">
                    {formatTZS(availableBalance)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4 px-6 py-5">
              {/* Method selector */}
              <div>
                <label className={labelCls}>Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["mobile_money", "bank"] as WithdrawMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWdMethod(m)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${wdMethod === m ? "border-primary bg-primary/5 text-primary" : "border-border text-gray-600 hover:border-gray-300"}`}
                    >
                      {m === "mobile_money"
                        ? "📱 Mobile Money"
                        : "🏦 Bank Transfer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={labelCls}>Amount (TZS)</label>
                <input
                  type="number"
                  min="1000"
                  step="1"
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className={inputCls}
                  required
                />
                {wdAmount && parseFloat(wdAmount) > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTZS(parseFloat(wdAmount))}
                  </p>
                )}
              </div>

              {/* Recipient name */}
              <div>
                <label className={labelCls}>Recipient Full Name</label>
                <input
                  type="text"
                  value={wdRecipientName}
                  onChange={(e) => setWdRecipientName(e.target.value)}
                  placeholder="e.g. Oscar Mkatoliki"
                  className={inputCls}
                  required
                />
              </div>

              {/* Mobile Money fields */}
              {wdMethod === "mobile_money" && (
                <>
                  <div>
                    <label className={labelCls}>Mobile Network</label>
                    <select
                      value={wdNetwork}
                      onChange={(e) => setWdNetwork(e.target.value)}
                      className={inputCls}
                    >
                      {MNO_NETWORKS.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input
                      type="tel"
                      value={wdPhone}
                      onChange={(e) => setWdPhone(e.target.value)}
                      placeholder="255712345678"
                      className={inputCls}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Country code + number, no + (e.g. 255712345678)
                    </p>
                  </div>
                </>
              )}

              {/* Bank fields */}
              {wdMethod === "bank" && (
                <>
                  <div>
                    <label className={labelCls}>Bank</label>
                    <select
                      value={wdBankBic}
                      onChange={(e) => setWdBankBic(e.target.value)}
                      className={inputCls}
                    >
                      {TZ_BANKS.map((b) => (
                        <option key={b.bic} value={b.bic}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input
                      type="text"
                      value={wdAccountNumber}
                      onChange={(e) => setWdAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transfer Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ACH", "RTGS"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setWdTransferType(t)}
                          className={`rounded-lg border-2 py-2.5 text-sm font-medium transition ${wdTransferType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-gray-600 hover:border-gray-300"}`}
                        >
                          {t}{" "}
                          <span className="text-xs font-normal text-gray-400">
                            {t === "ACH" ? "(Standard)" : "(Instant)"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Error */}
              {wdError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                  {wdError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FiSend size={14} />
                  )}
                  {submitting ? "Processing…" : "Submit Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Finance</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Revenue from sales &amp; donations · Payments via ClickPesa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-white text-xs font-medium overflow-hidden">
            {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-2 transition ${dateRange === r ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {r === "all" ? "All time" : `Last ${r}`}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <FiDownload size={13} />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            <FiArrowDownLeft size={14} />
            Withdraw Funds
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FiAlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ─── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, val, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900 lg:text-2xl">
                  {val}
                </p>
                <p className="mt-1 text-xs text-gray-400">{sub}</p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
              >
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Balance strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-sm">
          <p className="text-xs font-medium text-emerald-100">
            Available Balance
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatTZS(availableBalance)}
          </p>
          <p className="mt-1 text-xs text-emerald-200">
            After{" "}
            {
              withdrawals.filter((w) =>
                ["completed", "success", "authorized"].includes(
                  w.status.toLowerCase(),
                ),
              ).length
            }{" "}
            completed withdrawals
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <FiArrowDownLeft size={16} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Withdrawn</p>
            <p className="text-lg font-bold text-gray-900">
              {formatTZS(totalWithdrawn)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <FiDollarSign size={16} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Order Value</p>
            <p className="text-lg font-bold text-gray-900">
              {formatTZS(stats.avgOrderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Revenue chart ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold text-gray-700">
          Monthly Revenue Breakdown
        </h3>
        {loading ? (
          <div className="flex h-52 items-center justify-center text-gray-400 gap-2">
            <FiRefreshCw className="animate-spin" size={16} />
            <span className="text-sm">Loading chart…</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-gray-400 text-sm">
            No revenue data yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(v) => (v === "sales" ? "Sales" : "Donations")}
              />
              <Bar
                dataKey="sales"
                name="sales"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="donations"
                name="donations"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Transactions table ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex gap-0 rounded-lg border border-border overflow-hidden text-xs font-medium">
            {(["all", "sales", "donations"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 capitalize transition ${tab === t ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t === "all" ? "All Transactions" : t}
              </button>
            ))}
          </div>
          <div className="relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, party…"
              className="rounded-lg border border-border py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-56"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
            <FiRefreshCw className="animate-spin" size={18} />
            <span className="text-sm">Loading transactions…</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Party</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((t) => (
                  <tr
                    key={`${t.type}-${t.id}`}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${t.type === "sale" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {t.type === "sale" ? (
                          <FiShoppingCart size={10} />
                        ) : (
                          <FiHeart size={10} />
                        )}
                        {t.type === "sale" ? "Sale" : "Donation"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                      {t.reference}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{t.party}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {formatTZS(t.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${txStatusBadge(t.status, t.type)}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-gray-50 px-5 py-3 text-xs text-gray-400">
              Showing {displayed.length} of {transactions.length} transactions
            </p>
          </div>
        )}
      </div>

      {/* ─── Withdrawal History ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <FiArrowDownLeft className="text-gray-400" size={16} />
            <h3 className="text-sm font-semibold text-gray-800">
              Withdrawal History
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadWithdrawals}
              disabled={loadingWd}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <FiRefreshCw
                size={12}
                className={loadingWd ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
            >
              <FiArrowDownLeft size={12} />
              New Withdrawal
            </button>
          </div>
        </div>

        {loadingWd ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <FiRefreshCw className="animate-spin" size={16} />
            <span className="text-sm">Loading…</span>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">No withdrawals yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
            >
              <FiArrowDownLeft size={13} />
              Make your first withdrawal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs text-gray-700">
                        {w.order_reference}
                      </p>
                      {w.clickpesa_ref && (
                        <p className="text-xs text-gray-400">
                          CP: {w.clickpesa_ref}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${w.method === "mobile_money" ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"}`}
                      >
                        {w.method === "mobile_money"
                          ? `📱 ${w.network?.replace(" TANZANIA", "") ?? "Mobile"}`
                          : `🏦 ${w.bank_name ?? "Bank"}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {w.recipient_name}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                      {w.account_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {formatTZS(w.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${WD_STATUS_COLORS[w.status.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatDate(w.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      {["pending", "failed"].includes(
                        w.status.toLowerCase(),
                      ) && (
                        <button
                          onClick={() => retryWithdrawal(w)}
                          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                        >
                          <FiSend size={11} />
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
