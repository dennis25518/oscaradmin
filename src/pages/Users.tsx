import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FiSearch, FiRefreshCw, FiUser } from "react-icons/fi";

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  profile_picture: string | null;
  created_at: string;
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, phone, address, profile_picture, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching profiles:", error.message);
        setProfiles([]);
        return;
      }

      setProfiles(
        (data ?? []).map((item: any) => ({
          id: item.id,
          email: item.email ?? "",
          name: item.name && item.name !== "EMPTY" ? item.name : "",
          phone: item.phone && item.phone !== "EMPTY" ? item.phone : "",
          address: item.address && item.address !== "EMPTY" ? item.address : "",
          profile_picture: item.profile_picture ?? null,
          created_at: item.created_at ?? "",
        }))
      );
    } catch (err) {
      console.error("Error loading profiles:", err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.email.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Users", value: profiles.length },
          { label: "Filtered", value: filtered.length },
          {
            label: "With Phone",
            value: profiles.filter((p) => !!p.phone).length,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <FiRefreshCw className="mx-auto mb-2 animate-spin text-2xl" />
                  Loading users...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.profile_picture ? (
                        <img
                          src={p.profile_picture}
                          alt={p.name || p.email}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-gray-400">
                          <FiUser size={14} />
                        </div>
                      )}
                      <span className="font-medium">
                        {p.name || <span className="text-gray-400 italic">No name</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {p.address || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <p className="text-right text-xs text-gray-400">
          Showing {filtered.length} of {profiles.length} users
        </p>
      )}
    </div>
  );
}
