import { useState, useEffect } from 'react';
import { Store, ShoppingBag, Truck, Sparkles, Gift, Star, MapPin, Clock, Award, Zap } from 'lucide-react';
import { AuthForm } from '../components/AuthForm';

export function Landing() {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'customer' | 'delivery' | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    // Preload animation
    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.role-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('opacity-100', 'translate-y-0');
        }, index * 150);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
        </div>
        <AuthForm mode={selectedRole} />
      </div>
    );
  }

  const roles = [
    {
      id: 'owner',
      icon: Store,
      title: 'Shop Owner',
      description: 'Manage your inventory, track orders, and grow your business',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-200',
      textColor: 'text-emerald-600',
      features: ['Inventory Management', 'Order Tracking', 'Analytics Dashboard']
    },
    {
      id: 'customer',
      icon: ShoppingBag,
      title: 'Customer',
      description: 'Browse items, place orders, and get Handicraft delivered',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-200',
      textColor: 'text-purple-600',
      features: ['Easy Ordering', 'Real-time Tracking', 'Quality Products']
    },
    {
      id: 'delivery',
      icon: Truck,
      title: 'Delivery Personnel',
      description: 'Delivery personnel login for managing deliveries',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-200',
      textColor: 'text-blue-600',
      features: ['Delivery Management', 'Order Status', 'Route Planning']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1500" />
        
        {/* Decorative floating elements */}
        <div className="absolute top-10 left-10 animate-float">
          <Sparkles className="w-8 h-8 text-purple-400 opacity-30" />
        </div>
        <div className="absolute bottom-10 right-10 animate-float-delayed">
          <Sparkles className="w-8 h-8 text-pink-400 opacity-30" />
        </div>
        <div className="absolute top-1/4 right-10 animate-float">
          <Star className="w-6 h-6 text-yellow-400 opacity-30" />
        </div>
        <div className="absolute bottom-1/4 left-10 animate-float-delayed">
          <Gift className="w-6 h-6 text-purple-400 opacity-30" />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl shadow-xl shadow-purple-200 animate-pulse">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl shadow-xl shadow-emerald-200 animate-pulse delay-500">
              <Store className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-4">
            JJ Handicraft Shop
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Handicraft delivered to your doorstep
            <Sparkles className="w-5 h-5 text-pink-400" />
          </p>
          
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-gray-500 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Free delivery within 5 km
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-purple-500" />
              Fast delivery
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Award className="w-4 h-4 text-pink-500" />
              Quality assured
            </span>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isHovered = hoveredCard === role.id;
            
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id as any)}
                onMouseEnter={() => setHoveredCard(role.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="role-card opacity-0 translate-y-8 transition-all duration-700 group"
              >
                <div className={`
                  bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 p-8 
                  hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 
                  relative overflow-hidden h-full
                `}>
                  {/* Decorative gradient overlay */}
                  <div className={`
                    absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.color}
                    transition-all duration-500
                  `} />
                  
                  {/* Animated background gradient */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br ${role.bgColor} opacity-0
                    group-hover:opacity-100 transition-opacity duration-500
                  `} />

                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`
                      w-24 h-24 ${role.iconBg} rounded-3xl flex items-center justify-center mx-auto mb-6
                      shadow-lg ${role.shadowColor} transform group-hover:scale-110 transition-transform duration-500
                    `}>
                      <Icon className="w-12 h-12 text-white" />
                    </div>

                    <h2 className={`text-2xl font-bold text-gray-900 mb-3 text-center transition-colors duration-300`}>
                      {role.title}
                    </h2>
                    
                    <p className="text-gray-600 mb-6 text-center leading-relaxed">
                      {role.description}
                    </p>

                    {/* Feature Tags */}
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {role.features.map((feature, idx) => (
                        <span key={idx} className={`
                          text-xs font-medium px-3 py-1 rounded-full
                          bg-white/50 backdrop-blur-sm border border-white/30
                          ${role.textColor}
                        `}>
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className={`
                      flex items-center justify-center gap-2 font-semibold 
                      ${role.textColor} group-hover:translate-x-1 transition-all duration-300
                    `}>
                      <span>Continue as {role.title.split(' ')[0]}</span>
                      <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  {isHovered && (
                    <div className={`absolute -inset-1 bg-gradient-to-r ${role.color} opacity-10 blur-xl rounded-3xl transition-opacity duration-500`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 bg-white/30 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-gray-600">Available</span>
            </div>
            <div className="w-px h-6 bg-gray-300/50" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-600">Fast Delivery</span>
            </div>
            <div className="w-px h-6 bg-gray-300/50" />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-600">Quality Guaranteed</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            © 2024 JJ Handicraft. All rights reserved. Made with ❤️
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }
      `}</style>
    </div>
  );
}