'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile menu state

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // Check if the user is an admin
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();
        
        if (data?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    };

    checkUser();

    // Listen for auth changes (like logging in or out)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) setIsAdmin(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navLinks = [
    { name: 'Group Stage', path: '/phase1' },
    { name: 'Knockout Round', path: '/phase2' },
    { name: 'Leaderboard', path: '/leaderboard' },
  ];

  return (
    <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo */}
        <Link href="/" className="text-xl font-black text-emerald-400 tracking-tighter">
          Ted's WC26<span className="text-white">POOL</span>
        </Link>
        
        {/* Desktop Links (Hidden on Mobile) */}
        <div className="hidden md:flex space-x-1 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === link.path 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <Link 
              href="/admin"
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                pathname === '/admin' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'text-amber-500/70 hover:text-amber-400 hover:bg-slate-900'
              }`}
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* Right Side: Auth Status & Hamburger */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-xs font-medium text-slate-400 hidden sm:block">
                {user.email}
              </span>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Link 
              href="/login"
              className="text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
            >
              Log In
            </Link>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 shadow-2xl absolute w-full left-0">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                pathname === link.path 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <Link 
              href="/admin"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                pathname === '/admin' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'text-amber-500/70 hover:text-amber-400 hover:bg-slate-800/50'
              }`}
            >
              Admin Panel
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}