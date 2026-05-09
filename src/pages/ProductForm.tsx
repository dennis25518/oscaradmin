import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FiUpload, FiImage, FiFile, FiX } from "react-icons/fi";

const BUCKET = "Mkatoliki_products";

const EMPTY = {
  name: "",
  description: "",
  price: "" as string | number,
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);
  const ebookRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    supabase
      .from("products")
      .select("id, name, description, price, image, file_url")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          price: data.price ?? 0,
        });
        if (data.image) setImagePreview(data.image);
        if (data.file_url) setExistingFileUrl(data.file_url);
      });
  }, [id, isEdit]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleEbookChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEbookFile(file);
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error("Upload failed: " + error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      let imageUrl = imagePreview;
      let fileUrl = existingFileUrl;

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, "product_images");
      }

      // Upload new ebook if selected
      if (ebookFile) {
        fileUrl = await uploadFile(ebookFile, "ebooks");
      }

      const payload: Record<string, any> = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        image: imageUrl || null,
        file_url: fileUrl || null,
      };

      let err;
      if (isEdit) {
        ({ error: err } = await supabase
          .from("products")
          .update(payload)
          .eq("id", id));
      } else {
        ({ error: err } = await supabase.from("products").insert(payload));
      }

      if (err) {
        setError(err.message);
        return;
      }

      navigate("/products");
    } catch (ex: any) {
      setError(ex.message ?? "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/products")}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h2>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        {/* Product Name */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Novena Ya Mt. Charbel"
            className={inputClass}
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Price (TZS) <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="number"
            min={0}
            step={100}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="e.g. 5000"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Describe the product…"
            className={inputClass}
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="mb-1 block text-sm font-medium">Cover Image</label>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="preview"
                className="h-40 w-40 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                  if (imageRef.current) imageRef.current.value = "";
                }}
                className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 shadow border border-gray-200 text-gray-500 hover:text-red-500"
              >
                <FiX size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 text-sm text-gray-500 hover:border-primary hover:text-primary transition"
            >
              <FiImage size={20} />
              Click to upload cover image
            </button>
          )}
          {imagePreview && !imageFile && (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FiUpload size={12} /> Change image
            </button>
          )}
        </div>

        {/* eBook File */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            eBook / PDF File
          </label>
          <input
            ref={ebookRef}
            type="file"
            accept=".pdf,.epub,.doc,.docx"
            className="hidden"
            onChange={handleEbookChange}
          />
          {ebookFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <FiFile className="text-emerald-600" size={18} />
              <span className="flex-1 truncate text-emerald-800">
                {ebookFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEbookFile(null);
                  if (ebookRef.current) ebookRef.current.value = "";
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <FiX size={16} />
              </button>
            </div>
          ) : existingFileUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <FiFile className="text-gray-500" size={18} />
              <span className="flex-1 truncate text-gray-600 text-xs">
                {existingFileUrl.split("/").pop()}
              </span>
              <button
                type="button"
                onClick={() => ebookRef.current?.click()}
                className="text-xs text-primary hover:underline"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => ebookRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 text-sm text-gray-500 hover:border-primary hover:text-primary transition"
            >
              <FiFile size={20} />
              Click to upload PDF / eBook
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {saving ? "Saving…" : isEdit ? "Update Product" : "Add Product"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
