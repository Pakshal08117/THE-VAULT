import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle } from 'lucide-react';

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
    } catch (err: any) {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-vault-800 bg-vault-950 p-8 shadow-2xl premium-glow animate-slide-up">
        {/* Brand Head */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-vault-gold bg-gradient-to-br from-vault-900 to-vault-800 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <span className="font-serif text-2xl font-bold text-vault-gold">V</span>
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-widest text-[#f4f4f5]">WELCOME BACK</h2>
          <p className="mt-1 text-xs text-vault-500 uppercase tracking-widest">Unlock your private thoughts</p>
        </div>

        {/* Error Feedback */}
        {(error || localError) && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-vault-rose/20 bg-vault-rose/5 p-4 text-sm text-vault-rose">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold">Unlock Failed</p>
              <p className="text-xs text-vault-400">{localError || error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Email Address</label>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <Mail size={16} className="mr-3 text-vault-500" />
              <input
                type="email"
                id="login-email"
                placeholder="pakshalshah08117@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Password</label>
              <Link to="/reset-password" className="text-[10px] text-vault-500 hover:text-vault-gold transition">
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <KeyRound size={16} className="mr-3 text-vault-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="ml-2 text-vault-500 hover:text-vault-300 transition text-[10px]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            id="login-submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 py-3 text-xs font-bold tracking-widest text-vault-950 uppercase shadow-lg transition duration-200 hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-vault-950 border-t-transparent" />
            ) : (
              'Unlock Vault'
            )}
          </button>
        </form>

        {/* Registration Quicklink */}
        <p className="mt-8 text-center text-xs text-vault-500">
          First time here?{' '}
          <Link to="/register" className="font-semibold text-vault-gold hover:underline">
            Create your vault
          </Link>
        </p>
      </div>
    </div>
  );
};
