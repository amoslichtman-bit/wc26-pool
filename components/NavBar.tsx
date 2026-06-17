'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo and Links */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-black text-emerald-400 tracking-tighter">
            Ted's WC26<span className="text-white">POOL</span>
          </Link>
          
          <div className="hidden md:flex space-x-1">
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
        </div>

        {/* Right Side: Auth Status */}
        <div className="flex items-center space-x-4">
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
              className="text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 px-5 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
            >
              Log In
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}