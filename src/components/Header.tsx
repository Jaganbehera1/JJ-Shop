import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();

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
    </header>
  );
}
