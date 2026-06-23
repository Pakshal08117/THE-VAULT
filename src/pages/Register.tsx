import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, User, AlertCircle, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { motion } from 'framer-motion';

export const Register: React.FC = () => {
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const pwChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !username || !password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, username, password);
      navigate('/');
    } catch {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create Your Vault" subtitle="Build your secure digital sanctuary">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        {(error || localError) && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-vault-rose/20 bg-vault-rose/5 p-3 text-sm text-vault-rose">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold">Creation Failed</p>
              <p className="text-xs text-vault-400">{localError || error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Register form">
          <div>
            <label htmlFor="register-username" className="block text-xs font-semibold text-vault-400">Pen Name / Username</label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <User size={16} />
              </div>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="AestheticPoet"
                className="w-full rounded-2xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none transition"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-vault-400">Email</label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <Mail size={16} />
              </div>
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="block text-xs font-semibold text-vault-400">Password</label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <KeyRound size={16} />
              </div>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create master password"
                className="w-full rounded-2xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none transition"
                autoComplete="new-password"
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

            <div className="mt-3 rounded-lg border border-vault-800 bg-vault-900/30 p-3 text-sm">
              <div className="mb-2 text-xs font-semibold text-vault-400">Password Requirements</div>
              <ul className="grid grid-cols-1 gap-2 text-sm">
                <li className={`flex items-center gap-2 ${pwChecks.upper ? 'text-vault-gold' : 'text-vault-500'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-sm ${pwChecks.upper ? 'bg-vault-gold text-black' : 'bg-transparent'}`}>{pwChecks.upper ? '✓' : '•'}</span>
                  Uppercase letter
                </li>
                <li className={`flex items-center gap-2 ${pwChecks.lower ? 'text-vault-gold' : 'text-vault-500'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-sm ${pwChecks.lower ? 'bg-vault-gold text-black' : 'bg-transparent'}`}>{pwChecks.lower ? '✓' : '•'}</span>
                  Lowercase letter
                </li>
                <li className={`flex items-center gap-2 ${pwChecks.number ? 'text-vault-gold' : 'text-vault-500'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-sm ${pwChecks.number ? 'bg-vault-gold text-black' : 'bg-transparent'}`}>{pwChecks.number ? '✓' : '•'}</span>
                  Number
                </li>
                <li className={`flex items-center gap-2 ${pwChecks.special ? 'text-vault-gold' : 'text-vault-500'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-sm ${pwChecks.special ? 'bg-vault-gold text-black' : 'bg-transparent'}`}>{pwChecks.special ? '✓' : '•'}</span>
                  Special character
                </li>
                <li className={`flex items-center gap-2 ${pwChecks.length ? 'text-vault-gold' : 'text-vault-500'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-sm ${pwChecks.length ? 'bg-vault-gold text-black' : 'bg-transparent'}`}>{pwChecks.length ? '✓' : '•'}</span>
                  Minimum 8 characters
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm" className="block text-xs font-semibold text-vault-400">Confirm Password</label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vault-500">
                <ShieldCheck size={16} />
              </div>
              <input
                id="register-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-2xl border border-vault-800 bg-transparent px-12 py-3 text-sm text-white placeholder-vault-600 focus:border-vault-gold focus:ring-2 focus:ring-vault-gold/20 outline-none transition"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-vault-gold/95 to-vault-gold/80 py-3 px-4 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(212,175,55,0.18)] hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                'CREATE VAULT'
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-vault-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-vault-gold hover:underline">
            Unlock it here
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default Register;
