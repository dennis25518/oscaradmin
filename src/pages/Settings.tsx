import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  FiGlobe,
  FiShield,
  FiBell,
  FiDatabase,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiChevronRight,
} from "react-icons/fi";

interface DbStats {
  orders: number;
  products: number;
  users: number;
  donations: number;
  comments: number;
  maswali: number;
}

export default function Settings() {
  const { user, adminProfile, signOut } = useAuth();

  // Notifications prefs (persisted in localStorage)
  const [notifOrders, setNotifOrders] = useState(() =>
    localStorage.getItem("notif_orders") !== "false"
  );
  const [notifDonations, setNotifDonations] = useState(() =>
    localStorage.getItem("notif_donations") !== "false"
  );
  const [notifComments, setNotifComments] = useState(() =>
    localStorage.getItem("notif_comments") !== "false"
  );
  const [notifMessages, setNotifMessages] = useState(() =>
    localStorage.getItem("notif_messages") !== "false"
  );

  // DB stats
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Reveal anon key
  const [showKey, setShowKey] = useState(false);

  // Copied state
  const [copied, setCopied] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const [o, p, u, d, c, m] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact" }).limit(1),
        supabase.from("products").select("id", { count: "exact" }).limit(1),
        supabase.from("profiles").select("id", { count: "exact" }).limit(1),
        supabase.from("sadaka").select("id", { count: "exact" }).limit(1),
        supabase.from("product_comments").select("id", { count: "exact" }).limit(1),
        supabase.from("maswali").select("id", { count: "exact" }).limit(1),
      ]);
      setDbStats({
        orders: o.count ?? 0,
        products: p.count ?? 0,
        users: u.count ?? 0,
        donations: d.count ?? 0,
        comments: c.count ?? 0,
        maswali: m.count ?? 0,
      });
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => { loadStats(); }, []);

  function saveNotif(key: string, val: boolean) {
    localStorage.setItem(key, String(val));
    showToast("success", "Notification preference saved.");
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSignOutAll() {
    if (!window.confirm("Sign out from all devices?")) return;
    await supabase.auth.signOut({ scope: "global" });
    await signOut();
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  const Toggle = ({
    label,
    desc,
    checked,
    onChange,
  }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">Manage your admin panel configuration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Account Info ── */}
        <Section title="Account" icon={FiShield}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="font-semibold text-gray-800">{user?.email ?? "—"}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <p className="font-semibold text-gray-800">
                  {adminProfile?.role === "super_admin"
                    ? "Super Admin"
                    : adminProfile?.role ?? "Admin"}
                </p>
              </div>
              <FiShield className="text-primary" size={18} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs text-gray-400">Account Status</p>
                <p className="font-semibold text-gray-800">
                  {adminProfile?.is_active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className={`h-2.5 w-2.5 rounded-full ${adminProfile?.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs text-gray-400">Email Verified</p>
                <p className="font-semibold text-gray-800">
                  {user?.email_confirmed_at ? "Yes" : "No"}
                </p>
              </div>
              {user?.email_confirmed_at ? (
                <FiCheckCircle className="text-emerald-500" size={16} />
              ) : (
                <FiAlertCircle className="text-yellow-500" size={16} />
              )}
            </div>
          </div>
        </Section>

        {/* ── Platform Info ── */}
        <Section title="Platform" icon={FiGlobe}>
          <div className="space-y-3 text-sm">
            {[
              { label: "Platform Name", val: "Oscar Mkatoliki" },
              { label: "Target Market", val: "Tanzania" },
              { label: "Currency", val: "TZS (Tanzanian Shilling)" },
              { label: "Language", val: "Swahili / English" },
              { label: "Store Categories", val: "Books, Music, Rosaries, Statues, Candles, Apparel, Gifts, Jewelry, Sacramentals" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="mt-0.5 font-medium text-gray-700">{val}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Notification Preferences ── */}
        <Section title="Notifications" icon={FiBell}>
          <div className="divide-y divide-gray-100">
            <Toggle
              label="New Orders"
              desc="Get notified when a new order is placed"
              checked={notifOrders}
              onChange={(v) => { setNotifOrders(v); saveNotif("notif_orders", v); }}
            />
            <Toggle
              label="Donations"
              desc="Get notified when a donation is received"
              checked={notifDonations}
              onChange={(v) => { setNotifDonations(v); saveNotif("notif_donations", v); }}
            />
            <Toggle
              label="New Comments"
              desc="Get notified when a product review is posted"
              checked={notifComments}
              onChange={(v) => { setNotifComments(v); saveNotif("notif_comments", v); }}
            />
            <Toggle
              label="New Messages"
              desc="Get notified when a visitor sends a message"
              checked={notifMessages}
              onChange={(v) => { setNotifMessages(v); saveNotif("notif_messages", v); }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Preferences are stored locally in your browser.
          </p>
        </Section>

        {/* ── Database Stats ── */}
        <Section title="Database Overview" icon={FiDatabase}>
          <div className="grid grid-cols-2 gap-3">
            {dbStats === null || loadingStats ? (
              <div className="col-span-2 flex items-center justify-center py-6 text-gray-400 gap-2">
                <FiRefreshCw className="animate-spin" size={16} />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              [
                { label: "Orders", val: dbStats.orders, color: "bg-blue-50 text-blue-700" },
                { label: "Products", val: dbStats.products, color: "bg-purple-50 text-purple-700" },
                { label: "Users", val: dbStats.users, color: "bg-emerald-50 text-emerald-700" },
                { label: "Donations", val: dbStats.donations, color: "bg-rose-50 text-rose-700" },
                { label: "Reviews", val: dbStats.comments, color: "bg-amber-50 text-amber-700" },
                { label: "Messages", val: dbStats.maswali, color: "bg-gray-50 text-gray-700" },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-xl ${color} px-4 py-3`}>
                  <p className="text-xs font-medium opacity-70">{label}</p>
                  <p className="mt-0.5 text-2xl font-bold">{val.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <FiRefreshCw size={12} className={loadingStats ? "animate-spin" : ""} />
            Refresh stats
          </button>
        </Section>

        {/* ── Supabase Connection ── */}
        <Section title="Supabase Connection" icon={FiDatabase}>
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Project URL</p>
                <button
                  type="button"
                  onClick={() => copyText(supabaseUrl, "url")}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FiCopy size={11} />
                  {copied === "url" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-0.5 break-all text-sm font-mono text-gray-700">{supabaseUrl}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Anon Key</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                  >
                    {showKey ? <FiEyeOff size={11} /> : <FiEye size={11} />}
                    {showKey ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(anonKey, "key")}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FiCopy size={11} />
                    {copied === "key" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="mt-0.5 break-all text-sm font-mono text-gray-700">
                {showKey ? anonKey : `${anonKey.slice(0, 20)}${"•".repeat(20)}`}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Connected to Supabase</span>
            </div>
          </div>
        </Section>

        {/* ── Security ── */}
        <Section title="Security" icon={FiShield}>
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <p className="font-medium text-gray-700">Session Management</p>
              <p className="mt-0.5 text-xs text-gray-500">
                You are currently signed in on this device.
              </p>
            </div>
            <button
              onClick={handleSignOutAll}
              className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition"
            >
              <div className="flex items-center gap-2">
                <FiLogOut size={15} />
                Sign out from all devices
              </div>
              <FiChevronRight size={14} />
            </button>
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <p className="font-medium text-gray-700">Row Level Security</p>
              <p className="mt-0.5 text-xs text-gray-500">
                All data access is protected by Supabase RLS policies using the{" "}
                <code className="rounded bg-gray-200 px-1 text-xs">is_admin()</code> function.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* Version footer */}
      <div className="rounded-xl bg-gray-50 px-5 py-4 text-xs text-gray-400 flex items-center justify-between flex-wrap gap-2">
        <span>Oscar Admin Panel &mdash; Built with React + Supabase + Tailwind CSS</span>
        <span>v1.0.0 &bull; {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
