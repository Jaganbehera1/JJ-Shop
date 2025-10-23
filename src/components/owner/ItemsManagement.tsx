import { useState, useEffect } from 'react';
import { supabase, Item, Category, ItemVariant } from '../../lib/supabase';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import ImageModal from '../ImageModal';
import { ItemForm } from './ItemForm';

export function ItemsManagement() {
  const [items, setItems] = useState<(Item & { category: Category; variants: ItemVariant[] })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [modal, setModal] = useState<{ src: string; alt?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // loadData called
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name').get(),
        supabase
          .from('items')
          .select('*, category:categories(*), variants:item_variants(*)')
          .order('created_at', { ascending: false })
          .get(),
      ]);

      // Debug logging to help track why categories may be empty
  // categoriesRes and itemsRes fetched

      if (categoriesRes?.error) {
        console.error('Categories fetch error', categoriesRes.error);
        throw categoriesRes.error;
      }
      if (itemsRes?.error) {
        console.error('Items fetch error', itemsRes.error);
        throw itemsRes.error;
      }

  let cats = (categoriesRes?.data || []) as Category[];
  const its = (itemsRes?.data || []) as (Item & { category: Category; variants: ItemVariant[] })[];
  // removed debug logs

      // If there are no categories in Firestore yet, insert a small default set
      if (Array.isArray(cats) && cats.length === 0) {
        console.info('[ItemsManagement] no categories found — seeding defaults');
        try {
          const defaultCats = [
            { name: 'Rice' },
            { name: 'Pulses' },
            { name: 'Oils' },
            { name: 'Spices' },
            { name: 'Flour' },
            { name: 'Dairy' },
            { name: 'Snacks' },
            { name: 'Beverages' },
          ];
          const insertRes = await supabase.from('categories').upsert(defaultCats as Partial<Category>[]).get();
          if (insertRes.error) {
            console.warn('[ItemsManagement] failed to seed categories', insertRes.error);
          } else {
            // re-fetch categories
            const refetch = await supabase.from('categories').select('*').order('name').get();
            cats = (refetch?.data || []) as Category[];
          }
        } catch {
          console.warn('[ItemsManagement] seed error');
        }
      }

      setCategories(cats);
      setItems(its);
    } catch (error) {
      console.error('Error loading data:', error);
      let msg = String(error);
      try {
        if (typeof error === 'object' && error && 'message' in error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msg = String((error as any).message ?? msg);
        }
      } catch {
        /* ignore */
      }
      alert('Failed to load items: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
  const delRes = await supabase.from('items').delete().eq('id', itemId).get();
  if (delRes.error) throw delRes.error;
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleAddClick = async () => {
    // Ensure categories are loaded before opening the form so the dropdown is populated
    if (categories.length === 0) {
      setLoading(true);
      try {
        const categoriesRes = await supabase.from('categories').select('*').order('name').get();
        if (categoriesRes.error) throw categoriesRes.error;
        setCategories((categoriesRes.data || []) as Category[]);
      } catch (err) {
        console.error('Error loading categories:', err);
        alert('Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <ItemForm
        item={editingItem}
        categories={categories}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Grocery Items</h2>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No items yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by adding your first grocery item
          </p>
            <button
            onClick={handleAddClick}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {item.image_url && (
                <button type="button" onClick={() => setModal({ src: item.image_url!, alt: item.name })} className="w-full block">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                </button>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600">{item.category?.name ?? 'Uncategorized'}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.in_stock
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Available Sizes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(item.variants || []).map((variant) => (
                      <span
                        key={variant.id}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {variant.quantity_unit} - ₹{variant.price}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </div>
                {modal && <ImageModal src={modal.src} alt={modal.alt} onClose={() => setModal(null)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
