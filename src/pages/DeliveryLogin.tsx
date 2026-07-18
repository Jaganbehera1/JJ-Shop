import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Truck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  Phone,
  User
} from 'lucide-react';

type LoginMethod = 'email' | 'phone';

export default function DeliveryLogin() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('delivery_identifier');
    const savedRemember = localStorage.getItem('delivery_remember');
    if (savedIdentifier && savedRemember === 'true') {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validate input
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      await signIn(identifier, password);
      setSuccess(true);
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('delivery_identifier', identifier);
        localStorage.setItem('delivery_remember', 'true');
      } else {
        localStorage.removeItem('delivery_identifier');
        localStorage.removeItem('delivery_remember');
      }

      // Redirect after short delay for success animation
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      console.error('Delivery login failed', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLoginMethod = () => {
    setLoginMethod(prev => prev === 'email' ? 'phone' : 'email');
    setIdentifier('');
    setError(null);
  };

  const getPlaceholder = () => {
    return loginMethod === 'email' 
      ? 'Enter your email address' 
      : 'Enter your phone number';
  };

  const getIcon = () => {
    return loginMethod === 'email' ? Mail : Phone;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1500" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl shadow-xl shadow-purple-200 animate-pulse mb-4">
                <Truck className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -left-2">
                <Sparkles className="w-5 h-5 text-pink-400 animate-pulse delay-500" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Delivery Portal
            </h2>
            <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-purple-500" />
              Secure access for delivery personnel
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Login successful!</p>
                <p className="text-xs text-emerald-600">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Login failed</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Login Method Toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl">
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setError(null); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  loginMethod === 'email'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setError(null); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  loginMethod === 'phone'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </button>
            </div>

            {/* Identifier Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  {loginMethod === 'email' ? (
                    <Mail className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Phone className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <input
                  required
                  type={loginMethod === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError(null);
                  }}
                  placeholder={getPlaceholder()}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-purple-300"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-purple-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600 group-hover:text-purple-600 transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>

            {/* Footer Note */}
            <div className="text-center">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                Secure delivery personnel access only
                <Zap className="w-3 h-3 text-yellow-400" />
              </p>
            </div>
          </form>

          {/* Decorative Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100/50 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse delay-300" />
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse delay-600" />
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-900" />
            </div>
            <span className="text-xs text-gray-400">Secure Connection</span>
            <Shield className="w-3 h-3 text-purple-400" />
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Powered by <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">JJ Handicraft</span>
          </p>
        </div>
      </div>
    </div>
  );
}