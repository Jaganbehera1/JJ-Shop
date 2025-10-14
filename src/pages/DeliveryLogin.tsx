import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DeliveryLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // load profile to ensure role is delivery
      const user = data.user;
      if (!user) throw new Error('No user returned');

      const { data: profileData, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (pErr) throw pErr;
      if (!profileData) {
        alert('No profile found for this user. Owner must create a delivery profile.');
        return;
      }
      if (profileData.role !== 'delivery') {
        alert('This account is not a delivery account. Use the appropriate login.');
        return;
      }

      // redirect to root (App will route delivery role to DeliveryDashboard)
      window.location.href = '/';
    } catch (err) {
      console.error('Delivery login failed', err);
      alert('Login failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h2 className="text-2xl font-bold mb-4">Delivery Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded" />
        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white px-4 py-2 rounded">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
