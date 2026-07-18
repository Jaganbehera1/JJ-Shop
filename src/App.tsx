import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { CustomerApp } from './pages/CustomerApp';
import Header from './components/Header';
import Footer from './components/Footer';
import DeliveryDashboard from './pages/DeliveryDashboard';
import DeliveryLogin from './pages/DeliveryLogin';
import { AuthForm } from './components/AuthForm';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [route, setRoute] = useState(() => window.location.pathname);

  const navigateTo = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setRoute(nextPath);
    window.dispatchEvent(new CustomEvent('app-route-change', { detail: nextPath }));
  };

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.pathname);
    const handleExternalRoute = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setRoute(detail);
      }
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('app-route-change', handleExternalRoute as EventListener);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('app-route-change', handleExternalRoute as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const pathname = route || '/';

  if (pathname === '/owner' || pathname.startsWith('/owner/')) {
    if (user && profile?.role === 'owner') {
      return <OwnerDashboard />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <AuthForm mode="owner" />
      </div>
    );
  }

  if (pathname === '/delivery' || pathname.startsWith('/delivery/')) {
    if (user && profile?.role === 'delivery') {
      return <DeliveryDashboard />;
    }

    return <DeliveryLogin />;
  }

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    if (user && profile?.role === 'customer') {
      return <CustomerApp />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <AuthForm mode="customer" />
      </div>
    );
  }

  if (user && profile?.role === 'owner') {
    return <OwnerDashboard />;
  }

  if (user && profile?.role === 'delivery') {
    return <DeliveryDashboard />;
  }

  return <CustomerApp />;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <AppContent />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export function navigateToRoute(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new CustomEvent('app-route-change', { detail: path }));
}

export default App;
