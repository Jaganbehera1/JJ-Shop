import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProfileEdit from './ProfileEdit';

export default function Header() {
  const { user, signOut } = useAuth();

  const [editing, setEditing] = useState(false);

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold text-emerald-600">Grocery</a>
            <nav className="hidden sm:flex gap-3">
              <a href="#" className="text-sm text-gray-700 hover:text-emerald-600">Browse</a>
              <a href="#" className="text-sm text-gray-700 hover:text-emerald-600">Orders</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  title={user.email ?? 'Edit profile'}
                  className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold"
                >
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </button>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-700 hover:text-emerald-600"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a href="/" className="text-sm text-gray-700 hover:text-emerald-600">Sign in</a>
            )}
          </div>
        </div>
      </div>
      {editing && <ProfileEdit onClose={() => setEditing(false)} />}
    </header>
  );
}
