import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FiSearch, FiRefreshCw, FiStar, FiUser } from "react-icons/fi";

interface Comment {
  id: string;
  product_id: number;
  user_name: string;
  user_avatar: string;
  rating: number;
  body: string;
  proof_image_url: string;
  created_at: string;
  // joined from product_rating_summary
  product_name?: string;
}

interface RatingSummary {
  product_id: number;
  total_reviews: number;
  average_rating: number;
  product_name?: string;
}

export default function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [summaries, setSummaries] = useState<RatingSummary[]>([]);
  const [products, setProducts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"comments" | "summary">("comments");

  async function load() {
    setLoading(true);

    const [commentsRes, summaryRes, productsRes] = await Promise.all([
      supabase
        .from("product_comments")
        .select(
          "id, product_id, user_name, user_avatar, rating, body, proof_image_url, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("product_rating_summary")
        .select("product_id, total_reviews, average_rating"),
      supabase.from("products").select("id, name"),
    ]);

    if (commentsRes.error)
      console.error("product_comments:", commentsRes.error.message);
    if (summaryRes.error)
      console.error("product_rating_summary:", summaryRes.error.message);

    // Build product id→name map
    const prodMap: Record<number, string> = {};
    (productsRes.data ?? []).forEach((p: any) => {
      prodMap[p.id] = p.name ?? `Product #${p.id}`;
    });
    setProducts(prodMap);

    setComments(
      (commentsRes.data ?? []).map((c: any) => ({
        id: c.id,
        product_id: c.product_id,
        user_name: c.user_name ?? "Anonymous",
        user_avatar: c.user_avatar ?? "",
        rating: Number(c.rating ?? 0),
        body: c.body ?? "",
        proof_image_url: c.proof_image_url ?? "",
        created_at: c.created_at ?? "",
        product_name: prodMap[c.product_id] ?? `Product #${c.product_id}`,
      })),
    );

    setSummaries(
      (summaryRes.data ?? [])
        .map((s: any) => ({
          product_id: s.product_id,
          total_reviews: Number(s.total_reviews ?? 0),
          average_rating: Number(s.average_rating ?? 0),
          product_name: prodMap[s.product_id] ?? `Product #${s.product_id}`,
        }))
        .sort((a, b) => b.total_reviews - a.total_reviews),
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = comments.filter((c) => {
    const s = search.toLowerCase();
    return (
      !s ||
      c.user_name.toLowerCase().includes(s) ||
      c.body.toLowerCase().includes(s) ||
      (c.product_name ?? "").toLowerCase().includes(s)
    );
  });

  function Stars({ rating }: { rating: number }) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <FiStar
            key={i}
            size={13}
            className={
              i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comments & Ratings</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Product reviews from customers
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

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Reviews</p>
          <p className="mt-1 text-2xl font-bold">{comments.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Products Reviewed</p>
          <p className="mt-1 text-2xl font-bold">{summaries.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Avg Rating (all)</p>
          <p className="mt-1 text-2xl font-bold">
            {comments.length > 0
              ? (
                  comments.reduce((s, c) => s + c.rating, 0) / comments.length
                ).toFixed(1)
              : "—"}
            {comments.length > 0 && (
              <span className="ml-1 text-base text-amber-400">★</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["comments", "summary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-primary text-white"
                : "bg-white text-gray-600 hover:bg-muted"
            }`}
          >
            {t === "comments"
              ? `All Comments (${comments.length})`
              : `Rating Summary`}
          </button>
        ))}
      </div>

      {/* All Comments Tab */}
      {tab === "comments" && (
        <>
          <div className="relative max-w-sm">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, product, message…"
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
                <FiRefreshCw className="mx-auto mb-2 animate-spin text-2xl text-gray-400" />
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
                <p className="text-sm text-gray-400">No comments yet.</p>
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-white shadow-sm border border-gray-100 p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {c.user_avatar ? (
                        <img
                          src={c.user_avatar}
                          alt={c.user_name}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <FiUser size={18} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {c.user_name}
                          </p>
                          <Stars rating={c.rating} />
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {c.product_name}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{c.body}</p>

                      {/* Proof image */}
                      {c.proof_image_url && (
                        <a
                          href={c.proof_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block"
                        >
                          <img
                            src={c.proof_image_url}
                            alt="proof"
                            className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && (
            <p className="text-right text-xs text-gray-400">
              Showing {filtered.length} of {comments.length}
            </p>
          )}
        </>
      )}

      {/* Rating Summary Tab */}
      {tab === "summary" && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-center">Total Reviews</th>
                <th className="px-5 py-3 text-center">Average Rating</th>
                <th className="px-5 py-3 text-center">Stars</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    No rating data yet.
                  </td>
                </tr>
              ) : (
                summaries.map((s) => (
                  <tr
                    key={s.product_id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {s.product_name}
                    </td>
                    <td className="px-5 py-3 text-center">{s.total_reviews}</td>
                    <td className="px-5 py-3 text-center font-semibold">
                      {s.average_rating.toFixed(1)}
                      <span className="ml-1 text-amber-400">★</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        <Stars rating={Math.round(s.average_rating)} />
                      </div>
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
