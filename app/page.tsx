'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true); 
  const [authLoading, setAuthLoading] = useState(false); 
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);

  // Claim Profile States
  const [needsClaim, setNeedsClaim] = useState(false);
  const [unclaimedProfiles, setUnclaimedProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        verifyProfile(session.user);
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const verifyProfile = async (user: any) => {
    setCurrentUser(user);
    // Check if this user already has a fully linked profile
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

    if (profile) {
      router.push('/phase1');
    } else {
      // Fetch profiles that have not been claimed yet (they don't have an email)
      const { data: availableProfiles } = await supabase.from('profiles').select('id, display_name').is('email', null).order('display_name');
      setUnclaimedProfiles(availableProfiles || []);
      setNeedsClaim(true);
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        verifyProfile(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Account created! Please link your profile.', type: 'success' });
        setTimeout(() => verifyProfile(data.user), 1000);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setAuthLoading(false);
    }
  };

  const handleClaimProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (selectedProfileId === 'NEW' && !newDisplayName.trim()) {
      setMessage({ text: 'Please enter a display name.', type: 'error' });
      return;
    }
    if (!selectedProfileId) {
      setMessage({ text: 'Please select a profile or create a new one.', type: 'error' });
      return;
    }

    setAuthLoading(true);
    setMessage(null);

    try {
      if (selectedProfileId === 'NEW') {
        // Create a brand new player
        const { error } = await supabase.from('profiles').insert({
          id: currentUser.id,
          auth_id: currentUser.id, // <-- ADDED THIS to match your schema
          email: currentUser.email,
          display_name: newDisplayName.trim()
        });
        if (error) throw error;
      } else {
        // Grab the old dummy profile's data
        const { data: oldProfile } = await supabase.from('profiles').select('*').eq('id', selectedProfileId).single();

        if (oldProfile) {
          // 1. Create the official profile using the secure Auth ID
          const { error: insertErr } = await supabase.from('profiles').insert({
            ...oldProfile,
            id: currentUser.id,
            auth_id: currentUser.id, // <-- ADDED THIS to match your schema
            email: currentUser.email
          });
          if (insertErr) throw insertErr;

          // 2. Transfer all their picks to the new Auth ID
          await supabase.from('phase_1_picks').update({ user_id: currentUser.id }).eq('user_id', selectedProfileId);
          await supabase.from('phase_2_picks').update({ user_id: currentUser.id }).eq('user_id', selectedProfileId);

          // 3. Delete the old dummy profile
          await supabase.from('profiles').delete().eq('id', selectedProfileId);
        }
      }

      router.push('/phase1');
    } catch (err: any) {
      setMessage({ text: 'Failed to set up profile. Please try again.', type: 'error' });
      console.error(err);
      setAuthLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">Ted&apos;s WC26 Pool</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {needsClaim ? 'Link your account to your bracket.' : 'Log in to view brackets and standings.'}
          </p>
        </div>

        {needsClaim ? (
          <form onSubmit={handleClaimProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Your Name</label>
              <select 
                required
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              >
                <option value="" disabled>-- Find Your Profile --</option>
                {unclaimedProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
                <option value="NEW">+ I am a new player</option>
              </select>
            </div>

            {selectedProfileId === 'NEW' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Enter Display Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Ted Lasso"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                />
              </div>
            )}

            {message && (
              <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-amber-900/50 transition-all disabled:opacity-50"
            >
              {authLoading ? 'Linking Profile...' : 'Claim Profile & Enter App'}
            </button>
          </form>
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}