import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface AdminProfile {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role: "super_admin" | "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  refreshAdminProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAdminProfile(uid: string) {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_id", uid)
        .single();
      
      if (error) {
        console.warn("Admin profile not found:", error.message);
        setAdminProfile(null);
        return;
      }
      
      setAdminProfile(data ?? null);
    } catch (err) {
      console.warn("Error fetching admin profile:", err);
      setAdminProfile(null);
    }
  }

  async function refreshAdminProfile() {
    if (user) await fetchAdminProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        fetchAdminProfile(u.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      if (u) {
        fetchAdminProfile(u.id);
      } else {
        setAdminProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminProfile,
        loading,
        refreshAdminProfile,
        signOut: () =>
          supabase.auth.signOut().then(() => {
            setAdminProfile(null);
          }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
