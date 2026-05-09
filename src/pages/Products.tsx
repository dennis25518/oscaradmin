import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, formatTZS } from "../lib/supabase";
import { FiSearch, FiImage, FiPlus, FiEdit2, FiTrash2, FiRefreshCw } from "react-icons/fi";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  file_url: string;
  created_at: string;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, image, file_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error.message);
      setProducts([]);
    } else {
      setProducts(
        (data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name ?? "",
          description: item.description ?? "",
          price: Number(item.price ?? 0),
          image: item.image ?? "",
          file_url: item.file_url ?? "",
          created_at: item.created_at ?? "",
        }))
      );
    }
    setLoading(false);
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/products/new")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            <FiPlus />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <FiRefreshCw className="mx-auto mb-3 animate-spin text-3xl text-gray-400" />
            <p className="text-gray-500">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <FiImage className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No products found</p>
            <button
              onClick={() => navigate("/products/new")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <FiPlus /> Add your first product
            </button>
          </div>
        ) : (
          filtered.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiImage size={48} className="text-gray-300" />
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3 flex-1">
                  {product.description || "No description"}
                </p>

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xl font-bold text-primary">
                    {formatTZS(product.price)}
                  </span>
                  {product.file_url && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      eBook
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-muted transition"
                >
                  <FiEdit2 size={14} /> Edit
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleting === product.id}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
                >
                  <FiTrash2 size={14} />
                  {deleting === product.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-right text-xs text-gray-400">
          Showing {filtered.length} of {products.length} products
        </p>
      )}
    </div>
  );
}
