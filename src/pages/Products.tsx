import { useEffect, useState } from "react";
import { supabase, formatTZS } from "../lib/supabase";
import { FiSearch, FiAlertCircle, FiImage } from "react-icons/fi";

interface Product {
  id: string;
  name: string;
  description: string;
  short_desc: string;
  sku: string;
  base_price: number;
  sale_price: number | null;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  brand_id: string | null;
  primary_image: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = data.map((item: any) => item.id).filter(Boolean);
      const mediaByProduct: Record<string, any[]> = {};

      if (productIds.length > 0) {
        const { data: mediaData, error: mediaError } = await supabase
          .from("product_media")
          .select("product_id, url, is_primary")
          .in("product_id", productIds);

        if (mediaError) {
          console.warn("Error fetching product media:", mediaError);
        } else if (mediaData) {
          mediaData.forEach((mediaItem: any) => {
            if (!mediaItem.product_id) return;
            mediaByProduct[mediaItem.product_id] ||= [];
            mediaByProduct[mediaItem.product_id].push(mediaItem);
          });
        }
      }

      const mapped = data.map((item: any) => {
        const media = mediaByProduct[item.id] ?? [];
        const primaryImage =
          media.find((m: any) => m?.is_primary)?.url || media[0]?.url || "";

        return {
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          short_desc: "",
          sku: "",
          base_price: Number(item.base_price ?? 0),
          sale_price: null,
          currency: "TZS",
          is_active: false,
          is_featured: false,
          category_id: null,
          brand_id: null,
          primary_image: primaryImage,
        } as Product;
      });

      setProducts(mapped);
    } catch (err) {
      console.error("Error loading products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const query = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse and manage your product catalog
        </p>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-gray-500">Loading products…</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <FiAlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const price = product.sale_price ?? product.base_price;
            return (
              <div
                key={product.id}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-lg transition"
              >
                <div className="mb-4 h-48 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.primary_image ? (
                    <img
                      src={product.primary_image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FiImage size={48} className="text-gray-400" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.is_featured && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500">SKU: {product.sku || "—"}</p>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {product.description || product.short_desc || "No description available"}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold text-primary">
                      {formatTZS(price)}
                    </p>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && filteredProducts.length > 0 && (
        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      )}
    </div>
  );
}
