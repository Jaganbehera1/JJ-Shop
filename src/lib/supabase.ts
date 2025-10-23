// Firebase-based shim to replace Supabase client for basic CRUD and auth used by the app.
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  collectionGroup,
  CollectionReference,
  Query,
  query as fbQuery,
  where as fbWhere,
  documentId,
  getDocs,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy as fbOrderBy,
  limit as fbLimit,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// ---- Firebase config (inlined from user-provided credentials) ----
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = getAnalytics(app);
} catch {
  // Analytics init failed; ignore in production
}
const auth = getAuth(app);
const db = getFirestore(app);
const storageClient = getStorage(app);

export type User = {
  id: string;
  email?: string | null;
};

export type Profile = {
  id: string;
  role: 'owner' | 'customer' | 'delivery';
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  image_url?: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  variants?: ItemVariant[];
};

export type ItemVariant = {
  id: string;
  item_id: string;
  quantity_unit: string;
  price: number;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_pin?: string | null;
  delivery_boy_id?: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  total_amount: number;
  status: 'pending' | 'accepted' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string;
  variant_id: string;
  item_name: string;
  quantity_unit: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
};

export type ShopLocation = {
  id: string;
  owner_id: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
};

export type CartItem = {
  item: Item;
  variant: ItemVariant;
  quantity: number;
};

// Minimal helper to convert Firebase user to our User type
function mapFbUser(u: FirebaseUser | null): User | null {
  if (!u) return null;
  return { id: u.uid, email: u.email ?? null };
}

// Simple QueryBuilder that maps a subset of Supabase JS usage to Firestore
// Types for the Firebase adapter
type FirebaseError = { code: string; message: string };

class QueryBuilder<T extends WithId> {
  private table: string;
  private filters: Array<{ type: 'eq' | 'in'; field: string; value: unknown }> = [];
  private _notEqualsFilters: Array<{ field: string; value: unknown }> = [];
  private _order: { field: string; ascending?: boolean } | null = null;
  private _limit: number | null = null;
  private _maybeSingle = false;
  private colRef: CollectionReference;
  private _selectStr = '*';
  private _operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private _payload: DocumentData | null = null;
  private _payloadMeta?: { __onConflict?: string };

  constructor(table: string) {
    this.table = table;
    this.colRef = collection(db, table);
  }

  eq(field: keyof T, value: unknown): QueryBuilder<T> {
    // If caller filters by 'id', treat it as Firestore documentId() rather than a regular field
    const f = field as string;
    if (f === 'id') {
      this.filters.push({ type: 'eq', field: '__document_id__', value });
    } else {
      this.filters.push({ type: 'eq', field: f, value });
    }
    return this;
  }

  in(field: keyof T, values: unknown[]): QueryBuilder<T> {
    const f = field as string;
    if (f === 'id') {
      this.filters.push({ type: 'in', field: '__document_id__', value: values });
    } else {
      this.filters.push({ type: 'in', field: f, value: values });
    }
    return this;
  }

  neq(field: keyof T, value: unknown): QueryBuilder<T> {
    const f = field as string;
    if (f === 'id') {
      this._notEqualsFilters.push({ field: '__document_id__', value });
    } else {
      this._notEqualsFilters.push({ field: f, value });
    }
    return this;
  }

  order(field: keyof T, opts?: { ascending?: boolean }): QueryBuilder<T> {
    this._order = { field: field as string, ascending: opts?.ascending };
    return this;
  }

  limit(n: number): QueryBuilder<T> {
    this._limit = n;
    return this;
  }

  private asFirebaseError(err: unknown): FirebaseError {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      return err as FirebaseError;
    }
    return {
      code: 'unknown',
      message: err instanceof Error ? err.message : String(err)
    };
  }

  private docToT(id: string, data: DocumentData): T {
    // Convert Firestore Timestamp fields to ISO strings
    const converted = { ...data };
    for (const [key, value] of Object.entries(converted)) {
      if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        converted[key] = value.toDate().toISOString();
      }
    }
    return { id, ...converted } as unknown as T;
  }

  select(selectStr = '*'): QueryBuilder<T> {
    this._selectStr = selectStr;
    return this;
  }

  async single(): Promise<{ data: T | null; error: FirebaseError | null }> {
    this._maybeSingle = true;
    const result = await this.get();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data?.[0] || null, error: null };
  }

  async maybeSingle(): Promise<{ data: T | null; error: FirebaseError | null }> {
    this._maybeSingle = true;
    const result = await this.get();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data?.[0] ?? null, error: null };
  }

  async get(): Promise<{ data: T[] | null; error: FirebaseError | null }> {
    try {
      let q: Query<DocumentData> = this.colRef;

      // Verbose debug for items collection to diagnose missing results
      // debug logs removed
      
      // Apply filters
      const whereClauses = this.filters.map(f => {
        if (f.type === 'eq') {
          if (f.field === '__document_id__') {
            return fbWhere(documentId(), '==', f.value as string);
          }
          return fbWhere(f.field, '==', f.value);
        }
        if (f.type === 'in' && Array.isArray(f.value)) {
          if (f.field === '__document_id__') {
            return fbWhere(documentId(), 'in', f.value as string[]);
          }
          return fbWhere(f.field, 'in', f.value);
        }
        throw new Error(`Invalid filter: ${f.type}`);
      });

      // Map any 'not equals' filters (converted to Firestore '!=' operator)
      for (const nf of this._notEqualsFilters) {
        if (nf.field === '__document_id__') {
          // Firestore doesn't support documentId() != directly in the SDK's where; emulate by filtering after fetch if needed
          // But for safety, add a where to exclude the specific id using '!=' if supported
          try {
            whereClauses.push(fbWhere(documentId(), '!=', nf.value as string));
          } catch {
            // ignore and rely on client-side filtering below
          }
        } else {
          try {
            whereClauses.push(fbWhere(nf.field, '!=', nf.value));
          } catch {
            // ignore; we'll filter client-side later
          }
        }
      }
      
      if (whereClauses.length > 0) {
        q = fbQuery(this.colRef, ...whereClauses);
      }

      // Apply ordering
      if (this._order) {
        q = fbQuery(q, fbOrderBy(this._order.field, this._order.ascending ? 'asc' : 'desc'));
      }

      // Apply limit
      if (this._limit !== null) {
        q = fbQuery(q, fbLimit(this._limit));
      }

      // Get initial query results
      const querySnap = await getDocs(q);
      
      // debug logs removed
      
      let resultDocs = querySnap.docs;

      // If we couldn't apply '!=' filters at the query level (some Firestore SDKs may not support certain combos),
      // apply them client-side as a safety fallback.
      if (this._notEqualsFilters.length > 0 && resultDocs.length > 0) {
        try {
          const filtered = resultDocs.filter(doc => {
            const data = doc.data();
            return this._notEqualsFilters.every(nf => {
              if (nf.field === '__document_id__') {
                return doc.id !== String(nf.value);
              }
              return data[nf.field] !== nf.value;
            });
          });
          if (filtered.length !== resultDocs.length) {
            resultDocs = filtered;
          }
        } catch (e) {
          // client-side neq filter fallback failed; ignore
        }
      }

      // If no results found at top-level collection, try collectionGroup queries
      if ((this.table === 'items' || this.table === 'item_variants' || this.table === 'orders') && querySnap.size === 0) {
          try {
            const cgSnap = await getDocs(collectionGroup(db, this.table));
            if (cgSnap.size > 0) {

            // For item_variants, apply any filters from the original query
            if (this.table === 'item_variants' && this.filters.length > 0) {
              const filteredDocs = cgSnap.docs.filter(doc => {
                try {
                  const data = doc.data();
                  return this.filters.every(f => {
                    if (f.type === 'eq') {
                      return data[f.field] === f.value;
                    }
                    if (f.type === 'in' && Array.isArray(f.value)) {
                      return f.value.includes(data[f.field]);
                    }
                    return false;
                  });
                } catch {
                  return false;
                }
              });
              
              if (filteredDocs.length > 0) {
                    filteredDocs.forEach(() => {});
                resultDocs = filteredDocs;
              }
            } else {
              resultDocs = cgSnap.docs;
            }
          }
        } catch (err) {
          console.warn(`[QueryBuilder] collectionGroup ${this.table} fallback failed`, err);
        }
      }

      let docs = resultDocs.map(doc => this.docToT(doc.id, doc.data()));

      // If this was an update operation triggered by update() or upsert(), apply the updates or upserts
      if (this._operation === 'update' && this._payload) {
        try {
          const payload = this._payload;
          const onConflict = this._payloadMeta?.__onConflict;

          // If payload is an array => upsert multiple
          if (Array.isArray(payload)) {
            const upserted: T[] = [];
            for (const item of payload) {
              const id = (item as WithId).id;

              if (typeof id === 'string' && id) {
                await setDoc(doc(db, this.table, id), item, { merge: true });
                upserted.push(this.docToT(id, item));
              } else {
                const added = await addDoc(this.colRef, item);
                upserted.push(this.docToT(added.id, item));
              }
            }
            docs = upserted;

          } else if (onConflict) {
            // If caller provided onConflict (e.g. 'owner_id'), and the payload contains that field,
            // use that field value as the document ID
            const payloadObj = payload as DocumentData;
            if (payloadObj && payloadObj[onConflict]) {
              const conflictVal = String(payloadObj[onConflict]);
              const docRef = doc(db, this.table, conflictVal);
              // write with merge to preserve existing fields
              await setDoc(docRef, payloadObj, { merge: true });
              docs = [this.docToT(conflictVal, payloadObj)];
            } else {
              // fall back to creating a new doc
              const added = await addDoc(this.colRef, payload as DocumentData);
              docs = [this.docToT(added.id, payload as DocumentData)];
            }

          } else if (resultDocs.length > 0) {
            // single object: apply update to matched docs (by earlier filters)
            await Promise.all(resultDocs.map((doc) => updateDoc(doc.ref, payload)));
            const afterSnap = await getDocs(q);
            docs = afterSnap.docs.map(doc => this.docToT(doc.id, doc.data()));

          } else {
            // no matched docs -> create a new document
            const added = await addDoc(this.colRef, payload as DocumentData);
            docs = [this.docToT(added.id, payload as DocumentData)];
          }
        } catch (err) {
          console.error('QueryBuilder update/apply error:', err);
          return { data: null, error: this.asFirebaseError(err) };
        }
      }

      // If this was a delete operation, remove the matched docs and return empty result
      if (this._operation === 'delete') {
        try {
          // Safety: if no whereClauses were applied, refuse to delete everything
          if (whereClauses.length === 0) {
            const err = { code: 'FORBIDDEN', message: 'Refusing to delete without filters' };
            console.error('Refusing delete without filters', err);
            return { data: null, error: err };
          }
          await Promise.all(resultDocs.map((doc) => deleteDoc(doc.ref)));
          return { data: [], error: null };
        } catch (err) {
          console.error('QueryBuilder delete apply error:', err);
          return { data: null, error: this.asFirebaseError(err) };
        }
      }

      // Handle joins for certain selects so code expecting Supabase-like joins works.
      // Orders already supported; also support items -> category and variants.
      if (this.table === 'orders' && this._selectStr.includes('order_items(*)')) {
          try {
            // processing orders with items
          const extended = await Promise.all(docs.map(async (order) => {
            try {
              // Try both root collection and subcollection paths
              const paths = [
                collection(db, 'order_items'),
                collection(db, `orders/${order.id}/order_items`)
              ];
              
              let orderItems: Array<DocumentData> = [];
              for (const path of paths) {
                      try {
                        const itemsSnap = await getDocs(fbQuery(path, fbWhere('order_id', '==', order.id)));
                        if (itemsSnap.size > 0) {
                          orderItems = itemsSnap.docs.map(d => this.docToT(d.id, d.data()));
                          break;
                        }
                      } catch {
                        // ignore per-path query errors
                      }
              }

              const orderWithItems = {
                ...order,
                order_items: orderItems
              };
              // order processed
              return orderWithItems;
            } catch (err) {
              console.error('[QueryBuilder] failed to process order items for', order.id, err);
              return { ...order, order_items: [] };
            }
          }));
          return { data: this._maybeSingle ? [extended[0]] : extended, error: null };
        } catch (err) {
          console.error('[QueryBuilder] orders join error:', err);
          return { data: docs.map(doc => ({ ...doc, order_items: [] })), error: null };
        }
      }

      // items: support `category:categories(*)` and `variants:item_variants(*)` tokens
      if (this.table === 'items' && (this._selectStr.includes('category:categories(*)') || this._selectStr.includes('variants:item_variants(*)'))) {
        // Build a map of categories if requested
  const categoriesMap: Record<string, DocumentData> = {};
        if (this._selectStr.includes('category:categories(*)')) {
          const catIds = Array.from(new Set(docs.map(d => (d as unknown as Record<string, unknown>).category_id as string).filter(Boolean)));
          if (catIds.length > 0) {
            try {
              // Query by document ID (documentId()) rather than a non-existent 'id' field
              const catsSnap = await getDocs(fbQuery(collection(db, 'categories'), fbWhere(documentId(), 'in', catIds as string[])));
              catsSnap.docs.forEach((c) => { categoriesMap[c.id] = c.data(); });
            } catch {
              // Firestore 'in' has limits or other issues; fallback to per-doc fetch by documentId
              for (const cid of catIds) {
                try {
                  const cSnap = await getDocs(fbQuery(collection(db, 'categories'), fbWhere(documentId(), '==', cid)));
                  cSnap.docs.forEach((c) => { categoriesMap[c.id] = c.data(); });
                } catch {
                  /* ignore per-category failure */
                }
              }
            }
          }
        }

        // Build variants map if requested
  const variantsMap: Record<string, Array<DocumentData>> = {};
        if (this._selectStr.includes('variants:item_variants(*)')) {
          const itemIds = docs.map(d => d.id).filter(Boolean) as string[];
          if (itemIds.length > 0) {
            try {
              // Firestore 'in' supports up to 10 values; chunk if necessary
              const chunkSize = 10;
              for (let i = 0; i < itemIds.length; i += chunkSize) {
                const chunk = itemIds.slice(i, i + chunkSize);
                  const vsSnap = await getDocs(fbQuery(collection(db, 'item_variants'), fbWhere('item_id', 'in', chunk as string[])));
                  vsSnap.docs.forEach((v) => {
                    const d = this.docToT(v.id, v.data());
                    const itemId = (v.data() as unknown as Record<string, unknown>).item_id as string;
                    if (!itemId) return;
                    variantsMap[itemId] = variantsMap[itemId] || [];
                    variantsMap[itemId].push(d as unknown as DocumentData);
                  });
              }
            } catch {
              // Fallback to per-item queries
              for (const id of itemIds) {
                try {
                  const vsSnap = await getDocs(fbQuery(collection(db, 'item_variants'), fbWhere('item_id', '==', id)));
                  variantsMap[id] = vsSnap.docs.map(v => this.docToT(v.id, v.data()) as unknown as DocumentData);
                } catch {
                  variantsMap[id] = [];
                }
              }
            }
          }
        }

        const extended = docs.map((it) => {
          const cid = (it as unknown as Record<string, unknown>).category_id as string | undefined;
          const cat = cid && categoriesMap[cid] ? ({ id: cid, ...(categoriesMap[cid]) } as DocumentData) : undefined;
          const vars = it.id ? (variantsMap[it.id] || []) : [];
          return {
            ...it,
            category: cat,
            variants: vars,
          };
        });

        return { data: this._maybeSingle ? [extended[0]] : extended, error: null };
      }

      // items debug removed
      return {
        data: this._maybeSingle ? [docs[0]] : docs,
        error: null
      };
    } catch (err) {
      console.error('QueryBuilder execute error:', err);
      return { data: null, error: this.asFirebaseError(err) };
    }
  }

  // Make the QueryBuilder awaitable/thenable so callers that `await` the builder
  // receive the same shape as .get(). This helps compatibility with existing
  // code that treated .select() as returning a promise.
  then<TResult1 = { data: T[] | null; error: FirebaseError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: FirebaseError | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    const p = this.get();
    // Use typed wrappers to avoid 'any' casts while preserving the Promise contract
    return p.then(
      onfulfilled as ((value: { data: T[] | null; error: FirebaseError | null }) => TResult1 | PromiseLike<TResult1>) | undefined,
      onrejected as ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined
    );
  }

  async insert(payload: Partial<T> | Partial<T>[]): Promise<{ data: T[] | null; error: FirebaseError | null }> {
    try {
      if (Array.isArray(payload)) {
        const results: T[] = [];
        for (const item of payload) {
          const data = item as DocumentData;
          const id = (item as WithId).id;
          if (typeof id === 'string' && id) {
            await setDoc(doc(db, this.table, id), data);
            results.push(this.docToT(id, data));
          } else {
            const docRef = await addDoc(this.colRef, data);
            results.push(this.docToT(docRef.id, data));
          }
        }
        return { data: results, error: null };
      }

      const data = payload as DocumentData;
      if ('id' in payload && typeof payload.id === 'string') {
        const docRef = doc(db, this.table, payload.id);
        await setDoc(docRef, data);
        return { data: [this.docToT(payload.id, data)], error: null };
      }
      const docRef = await addDoc(this.colRef, data);
      return { data: [this.docToT(docRef.id, data)], error: null };
    } catch (err) {
      console.error('QueryBuilder insert error:', err);
      return { data: null, error: this.asFirebaseError(err) };
    }
  }
  
  /**
   * Upsert accepts a single item or an array of items. If an item has an `id` field
   * we write it with setDoc (overwrite), otherwise we add a new document.
   * Optional opts supports { onConflict: 'id' } to mirror Supabase signature.
   */
  // Make upsert chainable: store payload and optional onConflict field and let get() apply it
  upsert(payload: Partial<T> | Partial<T>[], opts?: { onConflict?: string }): QueryBuilder<T> {
    this._operation = 'update';
    // store as payload; we treat upsert like an update-or-insert
    this._payload = Array.isArray(payload) ? (payload as DocumentData[]) : (payload as DocumentData);
    // store onConflict by putting it into a hidden property on the payload container
    if (opts?.onConflict) {
      this._payloadMeta = { __onConflict: opts.onConflict };
    }
    return this;
  }
  // Make update/delete chainable: store payload and perform action when get() is invoked
  update(updates: Partial<Omit<T, 'id'>>): QueryBuilder<T> {
    this._operation = 'update';
    this._payload = updates as DocumentData;
    return this;
  }

  delete(): QueryBuilder<T> {
    this._operation = 'delete';
    return this;
  }


}

// Channel implementation backed by Firestore onSnapshot
class Channel {
  private unsubscribeFn: Unsubscribe | null = null;
  constructor() {}

  on(_event: string, opts: { table: string; filter?: string }, cb: () => void) {
    const { table, filter } = opts;
    if (!table) return this;

    const colRef = collection(db, table);
    let q: Query<DocumentData> = colRef;

    // Support comma-separated filters like
    // "delivery_boy_id=eq.{id},status=eq.accepted" which is how
    // Supabase's realtime filter string is commonly formatted.
    if (filter && typeof filter === 'string') {
      try {
        const parts = filter.split(',').map(p => p.trim()).filter(Boolean);
        const clauses: Array<ReturnType<typeof fbWhere>> = [];
        for (const part of parts) {
          if (!part.includes('=')) continue;
          const [field, rhs] = part.split('=');
          if (!rhs) continue;
          const [op, ...rest] = rhs.split('.');
          // join the rest in case value contains dots
          const rawVal = rest.join('.');
          const value = rawVal?.startsWith('.') ? rawVal.slice(1) : rawVal;
          if (op === 'eq') {
            clauses.push(fbWhere(field, '==', value));
          } else if (op === 'neq' || op === 'not') {
            try { clauses.push(fbWhere(field, '!=', value)); } catch { /* ignore unsupported */ }
          }
        }
        if (clauses.length > 0) {
          q = fbQuery(colRef, ...clauses);
        }
      } catch {
        // ignore filter parse errors
      }
    }

    this.unsubscribeFn = onSnapshot(q, () => {
      try {
        cb();
      } catch (err) {
        console.error('Channel callback error:', err);
      }
    });

    return this;
  }

  subscribe() {
    return this;
  }

  unsubscribe() {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
  }
}

interface WithId extends DocumentData {
  id?: string;
}

// Firebase adapter with Supabase-like API
export const supabase = {
  db,
  analytics,

  from: <T extends WithId>(table: string): QueryBuilder<T> => new QueryBuilder<T>(table),

  channel: () => new Channel(),
  removeChannel: (channel: Channel) => { 
    try {
      channel.unsubscribe();
    } catch (err) {
      console.error('Error removing channel:', err);
    }
  },

  // Minimal storage shim to support image uploads used by ItemForm
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: Blob | Uint8Array | ArrayBuffer) {
          try {
            const ref = storageRef(storageClient, `${bucket}/${path}`);
            // uploadBytes accepts Blob or ArrayBuffer
            await uploadBytes(ref, file as Blob);
            return { error: null } as { error: null };
          } catch (err) {
            console.error('Storage upload error:', err);
            return { error: err } as { error: unknown };
          }
        },
        getPublicUrl(path: string) {
          try {
            const ref = storageRef(storageClient, `${bucket}/${path}`);
            const promise: Promise<{ publicUrl: string }> = getDownloadURL(ref).then(url => ({ publicUrl: url }));
            // Fallback computed public URL (works for public buckets)
            const bucketHost = (firebaseConfig.storageBucket && firebaseConfig.storageBucket.length > 0)
              ? firebaseConfig.storageBucket
              : `${firebaseConfig.projectId}.appspot.com`;
            const computed = `https://firebasestorage.googleapis.com/v0/b/${bucketHost}/o/${encodeURIComponent(`${bucket}/${path}`)}?alt=media`;
            return { data: { publicUrl: computed }, urlPromise: promise } as { data: { publicUrl: string }; urlPromise?: Promise<{ publicUrl: string }> };
          } catch (err) {
            console.error('GetPublicUrl error:', err);
            return { data: { publicUrl: '' } } as { data: { publicUrl: string } };
          }
        }
      };
    }
  },

  auth: {
    fbAuth: auth,
    async signUp({ email, password }: { email: string; password: string }) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        return { data: { user: mapFbUser(cred.user) }, error: null };
      } catch (err) {
        console.error('Sign up error:', err);
        return { data: null, error: err };
      }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: mapFbUser(cred.user) }, error: null };
      } catch (err) {
        console.error('Sign in error:', err);
        return { data: null, error: err };
      }
    },

    async signOut() {
      try {
        await fbSignOut(auth);
        return { error: null };
      } catch (err) {
        console.error('Sign out error:', err);
        return { error: err };
      }
    },

    async getSession() {
      try {
        const user = auth.currentUser;
        return { 
          data: { 
            session: user ? { user: mapFbUser(user) } : null
          },
          error: null
        };
      } catch (err) {
        console.error('Get session error:', err);
        return { data: null, error: err };
      }
    },

    onAuthStateChange(cb: (event: string, session: { user: User | null } | null) => void) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        cb('SIGNED_IN', user ? { user: mapFbUser(user) } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },

    async updateUser({ email, password }: { email?: string; password?: string }) {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('No user logged in');
        }

        if (email) {
          await fbUpdateEmail(user, email);
        }
        if (password) {
          await fbUpdatePassword(user, password);
        }

        return { data: { user: mapFbUser(user) }, error: null };
      } catch (err) {
        console.error('Update user error:', err);
        return { data: null, error: err };
      }
    }
  }
};

// Also export as default for flexibility
export default supabase;
