import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function DeliveryUserForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Trim inputs
      const eMail = email.trim();
      const pw = password.trim();
      const name = fullName.trim();
      const ph = phone.trim();

      // Try to create the auth user first
      const { data, error } = await supabase.auth.signUp({ email: eMail, password: pw });
      if (error) {
        // If user is already registered in auth, attempt to create profile row via RPC
        const errObj = error as unknown as Record<string, unknown>;
        const msg = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(errObj);
        if (msg.includes('User already registered')) {
          try {
            const rpc = await supabase.rpc('create_profile_for_email', { _email: eMail, _role: 'delivery', _full_name: name, _phone: ph });
            if (rpc.error) throw rpc.error;
            alert('Delivery profile created for existing user. They can log in now.');
            // notify other parts of the app to reload delivery users
            try { window.dispatchEvent(new CustomEvent('delivery_user_created', { detail: { email: eMail } })); } catch (e) { void e; }
            try { localStorage.setItem('delivery_user_created_at', String(Date.now())); } catch (e) { void e; }
            setEmail(''); setPassword(''); setFullName(''); setPhone('');
            setLoading(false);
            return;
          } catch (rpcErr) {
            console.error('RPC create_profile_for_email failed', rpcErr);
            // Helpful guidance when DB check constraint blocks role insertion
            // small type-guard to inspect known fields on the error object without using `any`
            const getErrField = (o: unknown, k: string) => {
              try {
                if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) return String((o as Record<string, unknown>)[k]);
              } catch (e) {
                void e;
              }
              return '';
            };

            const maybeCode = getErrField(rpcErr, 'code') || getErrField(rpcErr, 'status') || '';
            const maybeMsg = getErrField(rpcErr, 'message') || String(rpcErr);

            if (String(maybeCode) === '23514' || maybeMsg.includes('profiles_role_check')) {
              // Tell the owner exactly which SQL migration to run
              alert([
                'Failed to create delivery profile because your database is blocking the "delivery" role.',
                '',
                'To fix this, run the following SQL migrations in your Supabase project SQL editor (in this repo):',
                " - supabase/migrations/20251014_allow_delivery_role.sql",
                " - supabase/migrations/20251014_create_profile_rpc.sql",
                '',
                'After running them, try creating the delivery user again. If you need, open the repo file and copy the SQL into the Supabase SQL editor.'
              ].join('\n'));
              setLoading(false);
              return;
            }
            // otherwise rethrow to be caught by outer catch
            throw rpcErr;
          }
        }
        // not a known / handled error: rethrow
        throw error;
      }

      if (!data.user) throw new Error('Failed to create auth user');

      // Insert profile row for the newly created auth user
      const { error: pErr } = await supabase.from('profiles').insert({ id: data.user.id, role: 'delivery', full_name: name, phone: ph });
      if (pErr) throw pErr;
  alert('Delivery user created. They can log in after email confirmation (if required).');
  // notify other parts of the app to reload delivery users
  try { window.dispatchEvent(new CustomEvent('delivery_user_created', { detail: { email: eMail } })); } catch (e) { void e; }
  try { localStorage.setItem('delivery_user_created_at', String(Date.now())); } catch (e) { void e; }
      setEmail(''); setPassword(''); setFullName(''); setPhone('');
    } catch (err) {
      console.error('Failed to create delivery user', err);
      // Surface a clearer error to the owner
      const message = err instanceof Error ? err.message : String(err);
      alert('Failed to create delivery user: ' + message + '\n\nSee console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Create Delivery Account</h3>
      <form onSubmit={handleCreate} className="space-y-3">
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border rounded" />
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 border rounded" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded" />
        <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-4 py-2 rounded">{loading ? 'Creating...' : 'Create Delivery User'}</button>
      </form>
    </div>
  );
}
