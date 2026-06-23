import React from 'react';
import { motion } from 'framer-motion';

type AuthLayoutProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen w-full bg-black/95 text-white">
      {/* Background and particles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.08),transparent_20%),radial-gradient(circle_at_80%_80%,rgba(212,175,55,0.04),transparent_30%)]" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />

        <div className="absolute left-1/4 top-10 -translate-x-1/2 animate-float-slow">
          <div className="h-1 w-1 rounded-full bg-vault-gold/70 blur-sm" />
        </div>
        <div className="absolute right-1/4 bottom-20 animate-float-slower">
          <div className="h-1.5 w-1.5 rounded-full bg-vault-gold/60 blur-sm" />
        </div>

        <style>{`
          @keyframes float-slow { 0%{ transform: translateY(0px);}50%{ transform: translateY(-18px);}100%{ transform: translateY(0px);} }
          @keyframes float-slower { 0%{ transform: translateY(0px);}50%{ transform: translateY(-10px);}100%{ transform: translateY(0px);} }
          .animate-float-slow{ animation: float-slow 8s ease-in-out infinite; }
          .animate-float-slower{ animation: float-slower 10s ease-in-out infinite; }
        `}</style>
      </div>

      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left hero - hidden on small screens */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden flex-col items-start justify-center gap-6 rounded-3xl px-8 py-12 lg:flex"
            aria-hidden
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-vault-gold bg-gradient-to-br from-vault-900 to-vault-800 shadow-[0_12px_40px_rgba(212,175,55,0.08)]">
                <span className="select-none font-serif text-2xl font-bold text-vault-gold">V</span>
              </div>
              <div>
                <h1 className="text-4xl font-serif font-bold tracking-tight text-white">THE VAULT</h1>
                <p className="mt-1 text-sm text-vault-500">Secure. Private. Yours.</p>
              </div>
            </div>

            <div className="mt-6 max-w-md rounded-2xl border border-vault-800 bg-gradient-to-br from-black/40 via-black/30 to-black/20 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">Your encrypted sanctuary</h3>
              <p className="mt-2 text-sm text-vault-400">Store your writing, thoughts, and secrets behind bank-grade encryption. The Vault keeps what matters safe.</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border border-vault-800 bg-vault-900/40" />
                <div className="flex-1">
                  <p className="text-xs text-vault-400">"Privacy is a right, not a feature."</p>
                  <p className="mt-1 text-[11px] text-vault-500">— THE VAULT</p>
                </div>
              </div>
            </div>

            <div className="mt-8 w-full rounded-2xl bg-vault-900/20 p-6 text-sm text-vault-400">
              <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-vault-900/40 via-black/10 to-black/5">
                {/* Decorative vault dial */}
                <div className="absolute left-6 top-6 h-28 w-28 rounded-full border-2 border-vault-800/60 bg-black/30" />
                <div className="absolute right-6 bottom-6 h-10 w-10 rounded-full border border-vault-gold/40 bg-vault-900/60" />
              </div>
            </div>
          </motion.aside>

          {/* Right auth card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center"
          >
            <div className="w-full max-w-md">
              <div className="relative rounded-3xl bg-black/40 p-8 backdrop-blur-lg">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-transparent via-black/20 to-transparent blur-[6px]" />
                <div className="relative z-10">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-serif font-bold text-white">{title || 'Welcome'}</h2>
                      {subtitle && <p className="mt-1 text-xs text-vault-400">{subtitle}</p>}
                    </div>
                    <div className="hidden sm:flex">
                      <div className="h-12 w-12 rounded-xl border border-vault-gold bg-gradient-to-br from-vault-900 to-vault-800 shadow-[0_10px_30px_rgba(212,175,55,0.08)] flex items-center justify-center">
                        <span className="font-serif text-lg font-bold text-vault-gold">V</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-vault-800/60 bg-black/40 p-4 shadow-xl">
                    {children}
                  </div>

                  <div className="mt-4 text-center text-xs text-vault-500">By continuing you agree to our privacy policy.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
