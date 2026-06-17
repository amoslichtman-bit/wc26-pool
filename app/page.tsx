'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true); // For initial session check
  const [authLoading, setAuthLoading] = useState(false); // For button state
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);

  // 1. Auto-Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/phase1');
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/phase1');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Success! You are now registered and logged in.', type: 'success' });
        setTimeout(() => router.push('/phase1'), 1500);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">World Cup Pool</h1>
          <p className="text-slate-400 text-sm sm:text-base">Log in to view brackets and standings.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            disabled={authLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-50"
          >
            {authLoading ? 'Authenticating...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up." : "Already have an account? Log in."}
          </button>
        </div>
      </div>
    </main>
  );
}