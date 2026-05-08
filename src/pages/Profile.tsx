import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { AdminProfile } from "../context/AuthContext";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiSave,
} from "react-icons/fi";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export default function Profile() {
  const { user, adminProfile, refreshAdminProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (adminProfile) {
      setFullName(adminProfile.full_name);
      setPhone(adminProfile.phone);
      setAvatarUrl(adminProfile.avatar_url);
    } else if (user) {
      setFullName(user.user_metadata?.full_name ?? "");
      setPhone(user.user_metadata?.phone ?? user.phone ?? "");
      setAvatarUrl(user.user_metadata?.avatar_url ?? "");
    }
  }, [user, adminProfile]);

  async function handleSave() {
    if (!adminProfile) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ full_name: fullName, phone, avatar_url: avatarUrl })
        .eq("id", adminProfile.id);
      
      if (error && !error.message.includes("does not exist")) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } catch (err) {
      console.warn("Error updating admin profile:", err);
    }
    
    // Also sync to auth metadata
    try {
      await supabase.auth.updateUser({
        data: { full_name: fullName, phone, avatar_url: avatarUrl },
      });
    } catch (err) {
      console.error("Error updating auth metadata:", err);
    }
    
    setSaving(false);
    setMessage("Profile updated successfully.");
    await refreshAdminProfile();
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Profile</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white ring-4 ring-primary/20">
                {(fullName || user?.email || "A").charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="mt-4 text-lg font-semibold">
              {fullName || "Admin"}
            </h3>
            <p className="text-sm text-gray-500">{user?.email ?? "-"}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <FiShield size={12} />{" "}
              {adminProfile
                ? (ROLE_LABELS[adminProfile.role] ?? adminProfile.role)
                : "Administrator"}
            </span>
          </div>

          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-3 text-sm">
              <FiMail className="shrink-0 text-gray-400" size={16} />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-700">
                  {user?.email ?? "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiPhone className="shrink-0 text-gray-400" size={16} />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="font-medium text-gray-700">{phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiCalendar className="shrink-0 text-gray-400" size={16} />
              <div>
                <p className="text-xs text-gray-400">Account Created</p>
                <p className="font-medium text-gray-700">{createdAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FiShield className="shrink-0 text-gray-400" size={16} />
              <div>
                <p className="text-xs text-gray-400">Last Sign In</p>
                <p className="font-medium text-gray-700">{lastSignIn}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs text-gray-400">User ID</p>
            <p className="mt-1 break-all text-xs font-mono text-gray-500">
              {user?.id ?? "-"}
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Edit Profile</h3>

            {message && (
              <div
                className={`mb-4 rounded-lg p-3 text-sm ${message.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
              >
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <div className="relative">
                  <FiMail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    value={user?.email ?? ""}
                    disabled
                    className={`${inputClass} pl-10 bg-muted text-gray-500 cursor-not-allowed`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Email cannot be changed from here.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <div className="relative">
                  <FiPhone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Avatar URL
                </label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className={inputClass}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition"
              >
                <FiSave size={16} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Auth Provider Info */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Authentication</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 font-medium text-gray-500">
                  Provider
                </dt>
                <dd className="text-gray-700">
                  {user?.app_metadata?.provider ?? "email"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 font-medium text-gray-500">
                  Role
                </dt>
                <dd className="text-gray-700">
                  {adminProfile
                    ? (ROLE_LABELS[adminProfile.role] ?? adminProfile.role)
                    : (user?.role ?? "authenticated")}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 font-medium text-gray-500">
                  Confirmed
                </dt>
                <dd className="text-gray-700">
                  {user?.email_confirmed_at ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Unverified
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
