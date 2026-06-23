import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const Register: React.FC = () => {
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
          <h2 className="font-serif text-2xl font-bold tracking-widest text-[#f4f4f5]">CREATE VAULT</h2>
          <p className="mt-1 text-xs text-vault-500 uppercase tracking-widest">Establish your secure digital repository</p>
        </div>

        {/* Error Feedback */}
        {(error || localError) && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-vault-rose/20 bg-vault-rose/5 p-4 text-sm text-vault-rose">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold">Creation Failed</p>
              <p className="text-xs text-vault-400">{localError || error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Username Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Pen Name / Username</label>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <User size={16} className="mr-3 text-vault-500" />
              <input
                type="text"
                placeholder="AestheticPoet"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Email Address</label>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <Mail size={16} className="mr-3 text-vault-500" />
              <input
                type="email"
                placeholder="writer@thevault.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Master Password</label>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <KeyRound size={16} className="mr-3 text-vault-500" />
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Confirm Password</label>
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 transition focus-within:border-vault-gold">
              <ShieldCheck size={16} className="mr-3 text-vault-500" />
              <input
                type="password"
                placeholder="Re-enter master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 py-3 text-xs font-bold tracking-widest text-vault-950 uppercase shadow-lg transition duration-200 hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-vault-950 border-t-transparent"></span>
            ) : (
              'Create Vault'
            )}
          </button>
        </form>

        {/* Login Quicklink */}
        <p className="mt-8 text-center text-xs text-vault-500">
          Already have a vault?{' '}
          <Link to="/login" className="font-semibold text-vault-gold hover:underline">
            Unlock it here
          </Link>
        </p>
      </div>
    </div>
  );
};
