import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function DeliveryLogin() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(identifier, password);
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
        <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or phone" className="w-full px-3 py-2 border rounded" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded" />
        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white px-4 py-2 rounded">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
