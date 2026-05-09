import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  FiSearch,
  FiRefreshCw,
  FiMessageCircle,
  FiMail,
  FiPhone,
} from "react-icons/fi";

interface Question {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

export default function Maswali() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("maswali")
      .select("id, name, email, phone, message, created_at")
      .order("created_at", { ascending: false });

    if (error) console.error("maswali:", error.message);
    setQuestions(
      (data ?? []).map((q: any) => ({
        id: q.id,
        name: q.name ?? "",
        email: q.email ?? "",
        phone: q.phone ?? "",
        message: q.message ?? "",
        created_at: q.created_at ?? "",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = questions.filter((q) => {
    const s = search.toLowerCase();
    return (
      !s ||
      q.name.toLowerCase().includes(s) ||
      q.email.toLowerCase().includes(s) ||
      q.message.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maswali</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Questions & messages from visitors
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={14} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm flex items-center gap-3 min-w-[140px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <FiMessageCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Messages</p>
            <p className="text-xl font-bold">{questions.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={15}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, message…"
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <FiRefreshCw className="mx-auto mb-2 animate-spin text-2xl text-gray-400" />
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <FiMessageCircle className="mx-auto mb-2 text-3xl text-gray-300" />
            <p className="text-sm text-gray-400">No messages yet.</p>
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Row header */}
              <button
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {q.name || "Anonymous"}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(q.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                      {q.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-primary font-medium">
                    {expanded === q.id ? "Hide ▲" : "View ▼"}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === q.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <FiMail size={14} className="text-gray-400" />
                      {q.email || "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <FiPhone size={14} className="text-gray-400" />
                      {q.phone || "—"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {q.message}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && (
        <p className="text-right text-xs text-gray-400">
          Showing {filtered.length} of {questions.length}
        </p>
      )}
    </div>
  );
}
