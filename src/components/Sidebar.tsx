import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  PlusCircle,
  FolderHeart,
  Tag,
  Star,
  Archive,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Compass,
  Keyboard,
  Link2,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  onSearchOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSearchOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Compass },
    { to: '/create', label: 'Create Writing', icon: PlusCircle },
    { to: '/categories', label: 'Categories', icon: FolderHeart },
    { to: '/tags', label: 'Tags', icon: Tag },
    { to: '/favorites', label: 'Favorites', icon: Star, color: 'text-amber-500' },
    { to: '/shares', label: 'Shares', icon: Link2, color: 'text-vault-emerald' },
    { to: '/archive', label: 'Archive', icon: Archive },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Console', icon: ShieldAlert, color: 'text-vault-gold' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="flex h-16 items-center justify-between border-b border-vault-800 bg-vault-950 px-4 md:hidden">
        <div className="flex items-center gap-2" onClick={() => navigate('/')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-vault-gold bg-gradient-to-br from-vault-900 to-vault-800">
            <span className="font-serif font-bold text-vault-gold">V</span>
          </div>
          <span className="font-serif text-lg font-bold tracking-widest text-[#f4f4f5]">THE VAULT</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSearchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-vault-800 bg-vault-900 text-vault-400 hover:text-vault-200"
            title="Search (Ctrl+K)"
          >
            <Compass size={18} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-vault-800 bg-vault-900 text-vault-400 hover:text-vault-200"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-vault-800 bg-vault-950 px-4 py-6 transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo and Brand */}
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { navigate('/'); closeMobile(); }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-vault-gold bg-gradient-to-br from-vault-900 to-vault-800 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <span className="font-serif text-xl font-bold text-vault-gold">V</span>
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold tracking-widest text-[#f4f4f5]">THE VAULT</h1>
              <p className="text-[10px] tracking-wider text-vault-500 uppercase">Private Library</p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="rounded p-1 text-vault-400 hover:bg-vault-900 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Search Quick Trigger (Desktop Only) */}
        <button
          onClick={() => {
            closeMobile();
            onSearchOpen();
          }}
          className="mb-6 hidden items-center justify-between rounded-xl border border-vault-800 bg-vault-900/60 px-4 py-2.5 text-left text-sm text-vault-400 transition hover:border-vault-700 md:flex"
        >
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-vault-500" />
            <span className="text-xs">Fuzzy omni-search...</span>
          </div>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-vault-800 bg-vault-950 px-1.5 font-mono text-[9px] font-medium text-vault-500">
            <span className="text-[10px]">Ctrl</span>K
          </kbd>
        </button>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition duration-200 group ${
                    isActive
                      ? 'bg-vault-800 text-[#f4f4f5] border-l-2 border-vault-gold'
                      : 'text-vault-400 hover:bg-vault-900/40 hover:text-vault-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={`transition-colors duration-200 ${item.color || 'text-vault-500 group-hover:text-vault-300'}`}
                  />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Shortcuts Panel info */}
        <div className="mb-4 hidden rounded-xl border border-vault-800 bg-vault-900/20 p-3 text-left md:block">
          <div className="flex items-center gap-1.5 text-vault-400 mb-1">
            <Keyboard size={12} className="text-vault-gold" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Hotkeys</span>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-vault-500">
            <div className="flex justify-between"><span>New Entry</span><kbd>Ctrl+N</kbd></div>
            <div className="flex justify-between"><span>Search</span><kbd>Ctrl+K</kbd></div>
            <div className="flex justify-between"><span>Back</span><kbd>Esc</kbd></div>
          </div>
        </div>

        {/* User profile footer info */}
        <div className="mt-auto border-t border-vault-800 pt-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vault-800 text-vault-gold">
                <User size={16} />
              </div>
              <div className="overflow-hidden text-left">
                <p className="truncate text-xs font-semibold text-zinc-200">{user?.username}</p>
                <p className="truncate text-[10px] text-vault-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-vault-500 hover:bg-vault-900 hover:text-vault-rose transition"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
