import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FiSearch } from "react-icons/fi";

interface AppUser {
  id: string;
  label: string;
  phone: string;
  is_primary: boolean;
  created_at: string;
  user_id: string;
}

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [subscribers, setSubscribers] = useState<
    { id: string; email: string; name: string; subscribed_at: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"contacts" | "subscribers">("contacts");

  useEffect(() => {
    (async () => {
      try {
        const [contactsRes, subsRes] = await Promise.all([
          supabase
            .from("user_contacts")
            .select("id, user_id, label, phone, is_primary, created_at")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("newsletter_subscribers")
            .select("id, email, name, subscribed_at")
            .order("subscribed_at", { ascending: false })
            .limit(200),
        ]);

        if (contactsRes.error) {
          console.error("Error fetching contacts:", contactsRes.error.message, contactsRes.error.details);
        }
        if (subsRes.error) {
          console.error("Error fetching subscribers:", subsRes.error.message, subsRes.error.details);
        }

        setUsers((contactsRes.data as AppUser[]) ?? []);
        setSubscribers(
          (subsRes.data as {
            id: string;
            email: string;
            name: string;
            subscribed_at: string;
          }[]) ?? [],
        );
      } catch (err) {
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredContacts = users.filter(
    (u) =>
      u.phone?.toLowerCase().includes(search.toLowerCase()) ||
      u.label?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredSubs = subscribers.filter(
    (s) =>
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Users</h2>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("contacts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "contacts" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-muted"}`}
        >
          User Contacts ({users.length})
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "subscribers" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-muted"}`}
        >
          Newsletter ({subscribers.length})
        </button>
      </div>

      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            tab === "contacts" ? "Search contacts…" : "Search subscribers…"
          }
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {tab === "contacts" ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-center">Primary</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium">{u.label}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_primary && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          ✓
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    No subscribers found.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium">{s.name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.email}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.subscribed_at
                        ? new Date(s.subscribed_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
