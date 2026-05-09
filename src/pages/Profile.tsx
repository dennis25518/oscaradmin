import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiSave,
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiLock,
} from "react-icons/fi";

const BUCKET = "Mkatoliki_products";
const FOLDER = "user_profiles";

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
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adminProfile) {
      setFullName(adminProfile.full_name ?? "");
      setPhone(adminProfile.phone ?? "");
      setAvatarUrl(adminProfile.avatar_url ?? "");
      setAvatarPreview(adminProfile.avatar_url ?? "");
    } else if (user) {
      setFullName(user.user_metadata?.full_name ?? "");
      setPhone(user.user_metadata?.phone ?? "");
      setAvatarUrl(user.user_metadata?.avatar_url ?? "");
      setAvatarPreview(user.user_metadata?.avatar_url ?? "");
    }
  }, [user, adminProfile]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string> {
    if (!avatarFile) return avatarUrl;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const uid = user?.id ?? "admin";
      const path = `${FOLDER}/${uid}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, avatarFile, { cacheControl: "3600", upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      let finalUrl = avatarUrl;
      if (avatarFile) finalUrl = await uploadAvatar();

      // Update admin_users using auth_id so it works even if adminProfile didn't load
      const { data, error } = await supabase
        .from("admin_users")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_id", user.id)
        .select("id");

      if (error)
        throw new Error(`Database error (${error.code}): ${error.message}`);
      if (!data || data.length === 0)
        throw new Error(
          "No admin_users row found for your account. Run the RLS policy SQL shown below.",
        );

      // Sync to Supabase auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: finalUrl,
        },
      });
      if (authErr) console.warn("Auth metadata sync failed:", authErr.message);

      setAvatarUrl(finalUrl);
      setAvatarFile(null);
      await refreshAdminProfile();
      showToast("success", "Profile updated successfully.");
    } catch (err: any) {
      showToast("error", err.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showToast("error", "New passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      showToast("error", "Password must be at least 8 characters.");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw new Error(error.message);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      showToast("success", "Password changed successfully.");
    } catch (err: any) {
      showToast("error", err.message ?? "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <FiCheckCircle size={16} />
          ) : (
            <FiAlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Admin Profile</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your personal information and account security
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Profile Card ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-1 flex flex-col">
          {/* Avatar upload */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-primary/20"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white ring-4 ring-primary/20">
                  {(fullName || user?.email || "A").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition border-2 border-white"
                title="Upload photo"
              >
                <FiCamera size={15} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarFile && (
              <p className="mt-2 text-xs text-primary">
                New photo selected — save to apply
              </p>
            )}
            <h3 className="mt-4 text-lg font-semibold">
              {fullName || "Admin"}
            </h3>
            <p className="text-sm text-gray-500">{user?.email ?? "—"}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <FiShield size={12} />
              {adminProfile
                ? (ROLE_LABELS[adminProfile.role] ?? adminProfile.role)
                : "Administrator"}
            </span>
          </div>

          {/* Info strip */}
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            {[
              { icon: FiMail, label: "Email", val: user?.email ?? "—" },
              { icon: FiPhone, label: "Phone", val: phone || "—" },
              { icon: FiCalendar, label: "Member Since", val: createdAt },
              { icon: FiClock, label: "Last Sign In", val: lastSignIn },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <Icon className="shrink-0 text-gray-400" size={15} />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-700">{val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-gray-400">Auth Provider</p>
            <p className="mt-0.5 text-sm font-medium text-gray-700 capitalize">
              {user?.app_metadata?.provider ?? "email"}
            </p>
            {user?.email_confirmed_at ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <FiCheckCircle size={10} /> Email Verified
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Unverified
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-gray-400">User ID</p>
            <p className="mt-0.5 break-all font-mono text-xs text-gray-400">
              {user?.id ?? "—"}
            </p>
          </div>
        </div>

        {/* ── Right: Forms ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Profile */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl bg-white p-6 shadow-sm space-y-5"
          >
            <h3 className="text-base font-semibold">Edit Profile</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={15}
                  />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <div className="relative">
                  <FiPhone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={15}
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={15}
                />
                <input
                  value={user?.email ?? ""}
                  disabled
                  className={`${inputClass} pl-10 cursor-not-allowed bg-muted text-gray-400`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Email address cannot be changed here.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {(saving || uploadingAvatar) && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <FiSave size={15} />
                {saving || uploadingAvatar ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Change Password */}
          <form
            onSubmit={handlePasswordChange}
            className="rounded-2xl bg-white p-6 shadow-sm space-y-5"
          >
            <div className="flex items-center gap-2">
              <FiLock size={18} className="text-gray-500" />
              <h3 className="text-base font-semibold">Change Password</h3>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                New Password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className={inputClass}
              />
              {confirmPw && newPw !== confirmPw && (
                <p className="mt-1 text-xs text-red-500">
                  Passwords do not match.
                </p>
              )}
              {confirmPw && newPw === confirmPw && confirmPw.length >= 8 && (
                <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                  <FiCheckCircle size={11} /> Passwords match
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPw || !newPw || newPw !== confirmPw}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-40 transition"
              >
                {savingPw && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <FiLock size={14} />
                {savingPw ? "Changing…" : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
