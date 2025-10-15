import { useState } from 'react';
import { Store, ShoppingBag } from 'lucide-react';
import { AuthForm } from '../components/AuthForm';

export function Landing() {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'customer' | 'delivery' | null>(null);

  if (selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <AuthForm mode={selectedRole} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            JJ Ration Shop
          </h1>
          <p className="text-xl text-gray-700">
            Fresh groceries delivered to your doorstep
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => setSelectedRole('owner')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Shop Owner
            </h2>
            <p className="text-gray-600 mb-6">
              Manage your inventory, track orders, and grow your business
            </p>
            <div className="text-emerald-600 font-semibold">
              Continue as Owner →
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('customer')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Customer
            </h2>
            <p className="text-gray-600 mb-6">
              Browse items, place orders, and get groceries delivered
            </p>
            <div className="text-teal-600 font-semibold">
              Continue as Customer →
            </div>
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => setSelectedRole('delivery')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v6.75" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 20.25h9" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Delivery
            </h2>
            <p className="text-gray-600 mb-6">
              Delivery personnel login (accounts created by owner)
            </p>
            <div className="text-indigo-600 font-semibold">
              Continue as Delivery →
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 text-sm">
            Delivery available within 5 km radius from shop location
          </p>
        </div>
      </div>
    </div>
  );
}
