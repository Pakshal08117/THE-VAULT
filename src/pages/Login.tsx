import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle } from 'lucide-react';
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
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {(error || localError) && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-vault-rose/20 bg-vault-rose/5 p-3 text-sm text-vault-rose">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold">Unlock Failed</p>
              <p className="text-xs text-vault-400">{localError || error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
          <label className="block text-xs font-semibold text-vault-400">Email</label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
              <Mail size={16} />
            </div>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-vault-400">Password</label>
              <Link to="/reset-password" className="text-xs text-vault-500 hover:text-vault-gold">
                Forgot?
              </Link>
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
                className="w-full rounded-xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none"
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

          <button
            type="submit"
            disabled={isSubmitting}
            id="login-submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/95 to-vault-gold/80 py-3 text-sm font-semibold text-black shadow-lg hover:scale-[1.01] active:scale-100 transition-transform disabled:opacity-60"
          >
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : 'Unlock Vault'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-vault-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-vault-gold hover:underline">
            Create a vault
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default Login;
