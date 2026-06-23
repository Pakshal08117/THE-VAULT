import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle, Lock } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Unlock your private vault">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        {(error || localError) && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-vault-rose/20 bg-vault-rose/5 p-3 text-sm text-vault-rose">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold">Unlock Failed</p>
              <p className="text-xs text-vault-400">{localError || error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" aria-label="Login form">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-vault-400">Email</label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <Mail size={16} />
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-2xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none transition"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-semibold text-vault-400">Password</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-vault-400">
                  <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} className="h-4 w-4 rounded-sm accent-vault-gold" />
                  Remember me
                </label>
                <Link to="/reset-password" className="text-xs text-vault-500 hover:text-vault-gold">
                  Forgot?
                </Link>
              </div>
            </div>

            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <KeyRound size={16} />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none transition"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-vault-500 hover:text-vault-gold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-vault-gold/95 to-vault-gold/80 py-3 px-4 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(212,175,55,0.18)] hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Lock size={16} />
                  UNLOCK VAULT
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-vault-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-vault-gold hover:underline">
            Create your vault
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default Login;
