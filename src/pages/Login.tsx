import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const HERO_IMAGE =
  "https://pznwwbrwgpxyveqbqhiq.supabase.co/storage/v1/object/public/Web_images/slider/Christ-the-king.png";

const LOGO =
  "https://pznwwbrwgpxyveqbqhiq.supabase.co/storage/v1/object/public/Web_images/oscar-mkatoliki-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    const { data: isAdmin, error: rpcErr } = await supabase.rpc("is_admin");
    if (rpcErr || !isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("You are not authorised to access the admin panel.");
      return;
    }
    setLoading(false);
    navigate("/");
  }

  const inputCls =
    "w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition";

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-14 lg:px-16">
        <div className="mx-auto w-full max-w-xs">
          {/* Logo */}
          <div className="mb-7 flex items-center gap-2.5">
            <img
              src={LOGO}
              alt="Oscar Mkatoliki"
              className="h-9 w-9 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-sm font-bold text-sidebar">
              Oscar Mkatoliki
            </span>
          </div>

          <h1 className="text-xl font-bold text-gray-900">Admin Sign In</h1>
          <p className="mt-1 text-xs text-gray-400">
            Restricted access — authorised personnel only.
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 px-3 py-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-9`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-sidebar py-2.5 text-sm font-semibold text-white hover:bg-sidebar/90 disabled:opacity-50 transition"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Right — Hero Image */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-sky-100">
        <img
          src={HERO_IMAGE}
          alt="Christ the King"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/60 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <p className="text-sm font-semibold opacity-90">Oscar Mkatoliki</p>
          <p className="mt-1 text-xs opacity-60">Admin Management Panel</p>
        </div>
      </div>
    </div>
  );
}
