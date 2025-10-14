import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileEdit({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile, updateAuth, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (password && password !== passwordConfirm) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Update auth first (email/password)
      if (email !== user?.email || password) {
        await updateAuth({ email: email !== user?.email ? email : undefined, password: password || undefined });
      }

      // Update profile fields
      await updateProfile({ full_name: fullName, phone, address });
      onClose();
    } catch (err) {
      console.error('Profile update failed', err);
      alert('Failed to update profile: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Edit Registration & Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">New Password (leave blank to keep)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <hr />
          <div>
            <label className="block text-sm text-gray-700 mb-1">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded bg-emerald-600 text-white">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
