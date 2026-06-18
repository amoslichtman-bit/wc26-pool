'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [unclaimedProfiles, setUnclaimedProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  
  // State to hold the display name for brand new users
  const [newDisplayName, setNewDisplayName] = useState('');

  // Fetch unclaimed placeholders when switching to sign-up mode
  useEffect(() => {
    if (!isSignUp) return;
    
    const fetchUnclaimed = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .is('auth_id', null)
        .order('display_name', { ascending: true });
      
      if (data) setUnclaimedProfiles(data);
    };
    fetchUnclaimed();
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isSignUp) {
      const metadata: any = {};
      
      if (selectedProfileId) {
        // They are claiming an existing bracket
        metadata.claim_profile_id = selectedProfileId;
      } else {
        // They are starting a new bracket. 
        // We take what they typed and silently append the tag before sending to Supabase.
        const cleanName = newDisplayName.trim() || 'Unnamed Player';
        metadata.display_name = `${cleanName} (freeloader)`; 
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ text: 'Account created! You can now log in.', type: 'success' });
        setUnclaimedProfiles(prev => prev.filter(p => p.id !== selectedProfileId));
        setSelectedProfileId('');
        setNewDisplayName('');
        setIsSignUp(false); // Switch to login mode
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ text: 'Logging in...', type: 'success' });
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-slate-400 text-sm">
            {isSignUp ? 'Sign up to submit or claim your bracket.' : 'Log in to view your bracket.'}
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!isSignUp ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${isSignUp ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sign Up
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-400 border-red-500/30' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Claim Bracket Dropdown */}
          {isSignUp && unclaimedProfiles.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Claim Existing Bracket (Optional)</label>
              <select
                value={selectedProfileId}
                onChange={(e) => {
                  setSelectedProfileId(e.target.value);
                  if (e.target.value !== '') setNewDisplayName(''); // Clear new name if they decide to claim
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              >
                <option value="">-- I am starting a new bracket --</option>
                {unclaimedProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* THE FIX: Conditional Display Name Input */}
          {/* This renders IF they are signing up AND they haven't selected a bracket to claim */}
          {isSignUp && !selectedProfileId && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Choose a Display Name</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="e.g. WorldCupWizard"
                required={isSignUp && !selectedProfileId} 
              />
              <p className="text-[10px] text-slate-500 mt-1">This name will appear on the leaderboard.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="you@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 ${
                isSignUp 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {isSignUp ? 'Create Account' : 'Log In'}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}