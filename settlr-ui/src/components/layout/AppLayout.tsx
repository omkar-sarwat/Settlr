// AppLayout — wraps all protected pages, redirects to /login if not authenticated
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for all pages that require login.
 * Shows the sidebar on desktop (md+) and bottom nav on mobile.
 * If the user is not logged in, they are redirected to /login.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If not logged in, send to login page
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar: hidden on mobile, shown on md+ screens */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main scrollable content area */}
      <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav: shown on mobile, hidden on md+ */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
