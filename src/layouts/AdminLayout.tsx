import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import {
  FiHome,
  FiBox,
  FiShoppingCart,
  FiUsers,
  FiHeart,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser,
  FiChevronsLeft,
  FiChevronsRight,
  FiMessageCircle,
  FiStar,
  FiBarChart2,
} from "react-icons/fi";

const NAV = [
  { to: "/", icon: FiHome, label: "Dashboard", end: true },
  { to: "/products", icon: FiBox, label: "Products" },
  { to: "/orders", icon: FiShoppingCart, label: "Orders" },
  { to: "/users", icon: FiUsers, label: "Users" },
  { to: "/donations", icon: FiHeart, label: "Donations" },
  { to: "/maswali", icon: FiMessageCircle, label: "Maswali" },
  { to: "/comments", icon: FiStar, label: "Comments" },
  { to: "/finance", icon: FiBarChart2, label: "Finance" },
  { to: "/settings", icon: FiSettings, label: "Settings" },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isProfileActive = location.pathname === "/profile";

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-white transition-all lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[72px]" : "w-64"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-white/10">
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight">
              ✝ Oscar Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:flex items-center justify-center rounded-lg p-1.5 text-white/50 hover:bg-sidebar-hover hover:text-white transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <FiChevronsRight size={18} />
            ) : (
              <FiChevronsLeft size={18} />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                } ${collapsed ? "justify-center px-0" : ""}`
              }
            >
              <n.icon size={18} className="shrink-0" />
              {!collapsed && n.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
            title={collapsed ? "Profile" : undefined}
            className={`mb-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 transition ${
              isProfileActive
                ? "bg-primary text-white"
                : "text-white/70 hover:bg-sidebar-hover hover:text-white"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isProfileActive ? "bg-white/20" : "bg-primary"
              }`}
            >
              {user?.email?.charAt(0).toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">
                  {user?.user_metadata?.full_name ?? "Admin"}
                </p>
                <p className="truncate text-xs text-white/50">{user?.email}</p>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-sidebar-hover hover:text-white transition ${collapsed ? "justify-center px-0" : ""}`}
          >
            <FiLogOut size={16} className="shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 lg:px-8">
          <button
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <h1 className="text-lg font-semibold">Oscar Mkatoliki Admin</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
