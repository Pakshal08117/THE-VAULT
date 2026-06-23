import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { OmniSearch } from './components/OmniSearch';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateWriting } from './pages/CreateWriting';
import { EditWriting } from './pages/EditWriting';
import { ViewWriting } from './pages/ViewWriting';
import { Categories } from './pages/Categories';
import { Tags } from './pages/Tags';
import { Favorites } from './pages/Favorites';
import { ArchivePage } from './pages/Archive';
import { Profile } from './pages/Profile';
import { SettingsPage } from './pages/Settings';
import { PublicShare } from './pages/PublicShare';
import { SharesDashboard } from './pages/SharesDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

import './App.css';

// Sub-component wrapper that has access to the router context (needed for hotkeys and layout)
const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K -> Toggle OmniSearch
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      
      // Ctrl+N -> New Writing (if authenticated)
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        const storedUser = localStorage.getItem('vault_user');
        if (storedUser) {
          e.preventDefault();
          navigate('/create');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-screen flex-col bg-[#09090b] text-[#f4f4f5] md:flex-row">
      <Routes>
        {/* Public auth pages */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Public shared reader page (no auth needed) */}
        <Route path="/share/:token" element={<PublicShare />} />

        {/* Protected app routes inside core shell */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex min-h-screen w-screen flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <Sidebar onSearchOpen={() => setIsSearchOpen(true)} />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-gradient-to-b from-vault-950 via-vault-950 to-vault-900">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/create" element={<CreateWriting />} />
                    <Route path="/edit/:id" element={<EditWriting />} />
                    <Route path="/view/:id" element={<ViewWriting />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/shares" element={<SharesDashboard />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global Search Modal Overlay */}
      <OmniSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VaultProvider>
          <AppShell />
        </VaultProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
