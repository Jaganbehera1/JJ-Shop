import { useState, useEffect, useCallback } from 'react';
import { supabase, Item, Category } from '../../lib/supabase';
import { X, Plus, Trash2, Upload } from 'lucide-react';

type ItemFormProps = {
  item: Item | null;
  categories: Category[];
  onClose: () => void;
};

type VariantInput = {
  id?: string;
  quantity_unit: string;
  price: string;
  stock?: number | string;
};

export function ItemForm({ item, categories, onClose }: ItemFormProps) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [inStock, setInStock] = useState(item?.in_stock ?? true);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [foundVariantsFromOther, setFoundVariantsFromOther] = useState<{ sourceItemId: string; variants: Array<any> } | null>(null);

  const loadVariants = useCallback(async () => {
    if (!item) return;
  // debug log removed
    try {
      const { data, error } = await supabase
        .from('item_variants')
        .select('*')
        .eq('item_id', item.id)
        .get();

  // debug log removed
      if (error) throw error;
      const docs = (data || []) as Array<{ id?: string; quantity_unit: string; price: number; stock?: number }>;
      setVariants(
        docs.map((v) => ({
          id: v.id,
          quantity_unit: v.quantity_unit,
          price: v.price.toString(),
          stock: (v.stock ?? 0).toString(),
        }))
      );

      // If no variants found, try to find another item with same name and load its variants as a candidate
      if ((!data || (Array.isArray(data) && data.length === 0)) && item.name) {
        try {
          const otherItemsRes = await supabase.from('items').select('*').eq('name', item.name).get();
          if (!otherItemsRes.error) {
            const others = otherItemsRes.data || [];
            const alt = (others as any[]).find((o) => o.id !== item.id);
            if (alt) {
              const altVarsRes = await supabase.from('item_variants').select('*').eq('item_id', alt.id).get();
              if (!altVarsRes.error && Array.isArray(altVarsRes.data) && altVarsRes.data.length > 0) {
                setFoundVariantsFromOther({ sourceItemId: alt.id, variants: altVarsRes.data as any[] });
              }
            }
          }
        } catch {
          // variant fallback search failed; ignore in production
        }
      } else {
        setFoundVariantsFromOther(null);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
    }
  }, [item]);

  const copyVariantsFromOther = async () => {
    if (!foundVariantsFromOther || !item) return;
    try {
      const rows = foundVariantsFromOther.variants.map((v) => ({
        item_id: item.id,
        quantity_unit: v.quantity_unit,
        price: v.price,
        stock: v.stock ?? 0,
      }));
      const { error } = await supabase.from('item_variants').insert(rows);
      if (error) throw error;
      // reload variants
      await loadVariants();
      setFoundVariantsFromOther(null);
      alert('Copied variants to this item');
    } catch (err) {
      console.error('Failed to copy variants:', err);
      alert('Failed to copy variants: ' + String(err));
    }
  };

  useEffect(() => {
    if (item) {
      // If the item already contains variants (joined), use them immediately.
      if ((item as any).variants && Array.isArray((item as any).variants) && (item as any).variants.length > 0) {
        setVariants((item as any).variants.map((v: any) => ({ id: v.id, quantity_unit: v.quantity_unit, price: (v.price ?? '').toString(), stock: ((v.stock ?? 0) as number).toString() })));
      } else {
        loadVariants();
      }
    } else {
      setVariants([{ quantity_unit: '', price: '' }]);
    }
  }, [item, loadVariants]);

  // Debug panel removed per cleanup: variants state is still loaded by loadVariants()

  // duplicate loadVariants removed (useCallback version above is used)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
  // NOTE: storage is not implemented in the Firebase adapter. Use a local
  // object URL as a temporary preview; in production replace this with
  // proper storage integration.
  setImageUrl(URL.createObjectURL(file));
    } catch (err: unknown) {
      console.error('Error uploading image:', err);
      // Supabase may return StorageApiError: Bucket not found
      const message = err instanceof Error ? err.message : String(err);
      if (message && message.toLowerCase().includes('bucket not found')) {
        alert(
          'Upload failed: storage bucket "images" not found in Supabase. Create a bucket named "images" in your Supabase project (Storage → New bucket) and make it public or configure appropriate policies, then try again. Alternatively you can paste an image URL in the field below.'
        );
      } else {
        alert(message || 'Failed to upload image');
      }
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { quantity_unit: '', price: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantInput, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId) {
      alert('Please select a category');
      return;
    }

    // Check if there are any partially filled variants that might be mistakes
    if (variants.some(v => (v.quantity_unit && !v.price) || (!v.quantity_unit && v.price))) {
      alert('You have variants with missing price or quantity unit. Please complete or remove them.');
      return;
    }

    // Filter out empty variants
    const validVariants = variants.filter(v => v.quantity_unit || v.price);
    setVariants(validVariants);

    setLoading(true);
    try {
      let itemId = item?.id;

      if (item) {
        const updRes = await supabase
          .from('items')
          .update({
            name,
            description,
            category_id: categoryId,
            image_url: imageUrl,
            in_stock: inStock,
          })
          .eq('id', item.id)
          .get();

        if (updRes.error) throw updRes.error;

        // Load existing variants to detect deletions
        const { data: existingVariants, error: loadErr } = await supabase
          .from('item_variants')
          .select('id')
          .eq('item_id', item.id)
          .get();

    if (loadErr) throw loadErr;

    const existingDocs = (existingVariants || []) as Array<{ id?: string }>;
    const existingIds: string[] = existingDocs.map((v) => v.id || '').filter(Boolean) as string[];
        const updatedIds: string[] = variants.filter((v) => v.id).map((v) => v.id as string);

        // IDs that would be deleted
        const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));

        if (idsToDelete.length > 0) {
          // Check if any of these variant IDs are referenced in order_items

          const { data: refs, error: refsErr } = await supabase
            .from('order_items')
            .select('variant_id,order_id')
            .in('variant_id', idsToDelete)
            .limit(1)
            .get();

          if (refsErr) throw refsErr;

          if (refs && refs.length > 0) {
            // Found at least one reference — abort and inform the user
            alert(
              'Unable to remove variant(s) because one or more are referenced by existing orders. To prevent breaking past orders, please edit the variant (e.g., set price to 0 or mark out-of-stock) instead of deleting it.'
            );
            setLoading(false);
            return;
          }

          // Safe to delete the unreferenced variants
          const delRes = await supabase.from('item_variants').delete().in('id', idsToDelete).get();
          if (delRes.error) throw delRes.error;
        }
      } else {
        const insertRes = await supabase.from('items').insert({
          name,
          description,
          category_id: categoryId,
          image_url: imageUrl,
          in_stock: inStock,
        });

        if (insertRes.error) throw insertRes.error;
        if (!insertRes.data || insertRes.data.length === 0) throw new Error('Insert failed');
        itemId = insertRes.data[0].id;
      }

      // Separate new variants (no id) and existing variants (with id)
      const newVariants = variants
        .filter((v) => !(typeof v.id === 'string' && v.id.trim().length > 0))
        .map((v) => ({
          item_id: itemId,
          quantity_unit: v.quantity_unit,
          price: parseFloat(v.price),
          stock: parseInt((v.stock ?? '0') as string, 10) || 0,
        }));

      const existingVariants = variants
        .filter((v) => typeof v.id === 'string' && v.id.trim().length > 0)
        .map((v) => ({
          id: v.id!.trim(),
          item_id: itemId,
          quantity_unit: v.quantity_unit,
          price: parseFloat(v.price),
          stock: parseInt((v.stock ?? '0') as string, 10) || 0,
        }));

      // Helper that attempts an insert and retries without `stock` if the
      // PostgREST schema cache doesn't include the column (PGRST204).
  const tryInsertWithStockFallback = async (rows: Array<Record<string, unknown>>) => {
        try {
          const res = await supabase.from('item_variants').insert(rows);
          if (res.error) throw res.error;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : JSON.stringify(err);
          // PostgREST returns PGRST204 when a requested column is missing from cache
          if (msg.includes("Could not find the 'stock' column") || msg.includes('PGRST204')) {
            // retry without stock property
            const rowsNoStock = rows.map((r) => {
              const copy = { ...r } as Record<string, unknown>;
              delete copy.stock;
              return copy;
            });
            const retryRes = await supabase.from('item_variants').insert(rowsNoStock);
            if (retryRes.error) throw retryRes.error;
            // Inform the owner that stock values were not saved because the DB
            // schema/cache doesn't include the `stock` column yet.
            alert('Item saved, but stock values were not stored because the database schema is missing the `stock` column or the REST schema cache is stale. Please apply migrations and restart/redeploy your Supabase project to enable stock tracking.');
          } else {
            throw err;
          }
        }
      };

      // Helper that attempts an upsert and retries without `stock` on the same error
  const tryUpsertWithStockFallback = async (rows: Array<Record<string, unknown>>) => {
        try {
          const upRes = await supabase.from('item_variants').upsert(rows, { onConflict: 'id' }).get();
          if (upRes.error) throw upRes.error;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : JSON.stringify(err);
          if (msg.includes("Could not find the 'stock' column") || msg.includes('PGRST204')) {
            const rowsNoStock = rows.map((r) => {
              const copy = { ...r } as Record<string, unknown>;
              delete copy.stock;
              return copy;
            });
            const retryUp = await supabase.from('item_variants').upsert(rowsNoStock, { onConflict: 'id' }).get();
            if (retryUp.error) throw retryUp.error;
            alert('Item updated, but stock values were not saved because the database schema is missing the `stock` column or the REST schema cache is stale. Please apply migrations and restart/redeploy your Supabase project to enable stock tracking.');
          } else {
            throw err;
          }
        }
      };

      // Insert new variants with fallback
      if (newVariants.length > 0) {
        await tryInsertWithStockFallback(newVariants);
      }

      // Upsert existing variants (id present) with fallback
      if (existingVariants.length > 0) {
        await tryUpsertWithStockFallback(existingVariants);
      }

      alert(item ? 'Item updated successfully!' : 'Item added successfully!');
      onClose();
    } catch (error: unknown) {
      console.error('Error saving item:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      alert(msg || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {item ? 'Edit Item' : 'Add New Item'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Basmati Rice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Describe the item..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
          </label>
          <div className="flex items-center gap-4">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Or paste image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Quantity Units & Prices
            </label>
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  required
                  value={variant.quantity_unit}
                  onChange={(e) =>
                    updateVariant(index, 'quantity_unit', e.target.value)
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., 1 kg, 500 g, 1 L"
                />
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, 'price', e.target.value)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Price"
                />
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {item && (
            <>
              {foundVariantsFromOther && (
                <div className="mt-3 p-3 bg-yellow-50 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">Found variants from another item (id: {foundVariantsFromOther.sourceItemId})</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyVariantsFromOther()}
                        className="text-sm bg-emerald-600 text-white px-3 py-1 rounded"
                      >Copy variants to this item</button>
                      <button
                        type="button"
                        onClick={() => setFoundVariantsFromOther(null)}
                        className="text-sm bg-gray-200 px-3 py-1 rounded"
                      >Dismiss</button>
                    </div>
                  </div>
                  <pre className="text-xs max-h-40 overflow-auto">{JSON.stringify(foundVariantsFromOther.variants, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inStock"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
            In Stock
          </label>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
