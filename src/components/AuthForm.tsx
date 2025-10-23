import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

type AuthFormProps = {
  mode: 'owner' | 'customer' | 'delivery';
};

export function AuthForm({ mode }: AuthFormProps) {
  const [rawError, setRawError] = useState<unknown | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRawError(null);

    try {
      // trim inputs to avoid accidental whitespace
      const emailTrim = email.trim();
      const passwordTrim = password.trim();

      if (isSignUp) {
        // Basic client-side email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrim)) {
          throw new Error('Please enter a valid email address');
        }
        if (mode === 'owner') {
          if (ownerCode !== 'ADMIN2025') {
            throw new Error('Invalid owner code. Please contact support if you need access.');
          }
        } else if (mode === 'delivery') {
          // Prevent open delivery registration
          throw new Error('Delivery accounts must be created by an admin. Please contact support.');
        }
        await signUp(emailTrim, passwordTrim, fullName.trim(), phone.trim(), mode);
        // show a friendly success message and switch to login mode
        setSuccess('Sign up successful. Please check your email to confirm your account (if required) or login.');
        // reset inputs and switch to login view
        setFullName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      } else {
        await signIn(emailTrim, passwordTrim);
      }
    } catch (err: unknown) {
      // Try to extract Supabase error message
      let msg = 'Authentication failed';
      if (err instanceof Error) msg = err.message;
      const maybeObj = err as { message?: string; details?: unknown } | null;
      if (maybeObj && maybeObj.message) msg = maybeObj.message;
      setError(msg || 'Authentication failed');
  setSuccess('');
      // Store raw error for dev debugging
      if (import.meta.env.MODE !== 'production') {
        setRawError(maybeObj?.details ?? err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'owner' ? 'Shop Owner' : mode === 'delivery' ? 'Delivery' : 'Customer'} {isSignUp ? 'Sign Up' : 'Login'}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              {mode === 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Code
                  </label>
                  <input
                    type="password"
                    required
                    value={ownerCode}
                    onChange={(e) => setOwnerCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter owner code"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
                type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your email or phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter your password"
              minLength={6}
            />
          </div>
          {rawError != null && import.meta.env.MODE !== 'production' && (
            <details className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
              <summary className="text-sm font-medium">Debug: raw error</summary>
              <pre className="text-xs mt-2 whitespace-pre-wrap">{typeof rawError === 'string' ? rawError : JSON.stringify(rawError, null, 2)}</pre>
            </details>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Loading...'
            ) : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Login
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isSignUp
              ? 'Already have an account? Login'
              : mode === 'owner'
              ? 'Owner registration disabled'
              : mode === 'delivery'
              ? 'Delivery registration disabled'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
