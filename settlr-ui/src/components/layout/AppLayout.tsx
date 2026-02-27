/**
 * App Layout Component
 * 
 * Main layout wrapper for all authenticated pages.
 * Contains:
 * - Authentication guard (redirects to /login if not authenticated)
 * - WebSocket connection for real-time updates
 * - Animated background orbs
 * - Sidebar navigation
 * - Main content area with proper spacing
 * 
 * All child pages are rendered in the main content area.
 */

import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { AnimatedOrbs } from './AnimatedOrbs';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';

export function AppLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Don't render layout if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[#0f0f13] text-white overflow-hidden">
      {/* Animated background orbs that drift slowly */}
      <AnimatedOrbs />
      
      {/* Top navigation */}
      <TopNav />
      
      {/* Main content area */}
      <main className="relative min-h-[calc(100vh-88px)] p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
