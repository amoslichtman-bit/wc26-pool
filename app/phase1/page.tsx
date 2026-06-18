'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation'; 

export const dynamic = 'force-dynamic';

const TOURNAMENT_GROUPS = [
  { name: 'Group A', teams: ['Czechia', 'Mexico', 'South Africa', 'South Korea'] },
  { name: 'Group B', teams: ['Bosnia & Herzigovina', 'Canada', 'Switzerland', 'Qatar'] },
  { name: 'Group C', teams: ['Brazil', 'Haiti', 'Morocco', 'Scotland'] },
  { name: 'Group D', teams: ['Australia', 'Paraguay', 'Turkey', 'United States'] },
  { name: 'Group E', teams: ['Curacao', 'Ecuador', 'Germany', 'Ivory Coast'] },
  { name: 'Group F', teams: ['Japan', 'Netherlands', 'Sweden', 'Tunisia'] },
  { name: 'Group G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { name: 'Group H', teams: ['Cape Verde', 'Saudi Arabia', 'Spain', 'Uruguay'] },
  { name: 'Group I', teams: ['France', 'Iraq', 'Norway', 'Senegal'] },
  { name: 'Group J', teams: ['Algeria', 'Argentina', 'Austria', 'Jordan'] },
  { name: 'Group K', teams: ['Colombia', 'DR Congo', 'Portugal', 'Uzbekistan'] },
  { name: 'Group L', teams: ['Croatia', 'England', 'Ghana', 'Panama'] },
];

export default function Phase1Picks() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Data States
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allPicks, setAllPicks] = useState<Record<string, Record<string, string>>>({});
  const [picks, setPicks] = useState<{ [team: string]: string }>({});
  // -> Added gd to state for tiebreakers
  const [liveStandings, setLiveStandings] = useState<{ [team: string]: { w: number, d: number, l: number, pts: number, gd: number } }>({});
  
  // View & Security States
  const [viewingUserId, setViewingUserId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // New Admin and Lock States
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [adminEditMode, setAdminEditMode] = useState(false);

  // Determine if we are viewing someone else
  const isViewingOther = viewingUserId !== '' && viewingUserId !== user?.id;
  const displayPicks = isViewingOther
    ? (currentUserIsAdmin && adminEditMode ? picks : (allPicks[viewingUserId] || {}))
    : picks;
  const activeProfile = profiles.find(p => p.id === viewingUserId);

  useEffect(() => {
    const fetchAllData = async () => {
      // 1. Fetch auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);
      setViewingUserId(currentUser.id);

      // 2. Fetch Profiles (now including the admin and lock status)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, email, is_admin, group_picks_submitted, is_locked')
        .order('display_name');

      if (profileError) {
        console.error('Profiles fetch error:', profileError);
      } else if (profileData) {
        setProfiles(profileData);
      }

      // 3. Find current user profile separately when needed
      let userProfile: any = profileData?.find(p => p.id === currentUser.id);
      if (!userProfile) {
        const { data: currentUserProfile, error: currentUserProfileError } = await supabase
          .from('profiles')
          .select('id, is_admin, group_picks_submitted, is_locked')
          .or(`auth_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
          .single();

        if (currentUserProfileError) {
          console.error('Current user profile lookup failed:', currentUserProfileError);
        } else {
          userProfile = currentUserProfile;
        }
      }

      if (userProfile) {
        setCurrentUserIsAdmin(userProfile.is_admin || false);
        setIsLocked(userProfile.group_picks_submitted || userProfile.is_locked || false);
      }

      // 4. Fetch All Phase 1 Picks
      const { data: allPicksData } = await supabase.from('phase_1_picks').select('user_id, team_name, placement').limit(10000);
      if (allPicksData) {
        const picksMap: Record<string, Record<string, string>> = {};
        allPicksData.forEach(p => {
          if (!picksMap[p.user_id]) picksMap[p.user_id] = {};
          picksMap[p.user_id][p.team_name] = p.placement;
        });
        setAllPicks(picksMap);

        if (currentUser) {
          const userPicksArray = allPicksData.filter(p => p.user_id === currentUser.id);
          const loadedPicks: { [team: string]: string } = {};
          userPicksArray.forEach(pick => { loadedPicks[pick.team_name] = pick.placement; });
          setPicks(loadedPicks);
        }
      }
    };

    const fetchLiveStandings = async () => {
        try {
          const res = await fetch('/api/standings');
          if (res.ok) {
            const data = await res.json();
            const groupStandings = data.standings.filter((s: any) => s.type === 'TOTAL');
            const standingsMap: any = {};
    
            groupStandings.forEach((group: any) => {
              group.table.forEach((teamRow: any) => {
                const apiName = teamRow.team.name;
                const API_TO_SHEET_MAP: Record<string, string> = {
                  "United States": "United States", "USA": "United States",
                  "Bosnia and Herzegovina": "Bosnia & Herzigovina", "Bosnia-Herzegovina": "Bosnia & Herzigovina",
                  "Czech Republic": "Czechia", "Korea Republic": "South Korea", "Congo DR": "DR Congo",
                  "Côte d'Ivoire": "Ivory Coast", "Cabo Verde": "Cape Verde", "Cape Verde Islands": "Cape Verde"
                };
                const translatedName = API_TO_SHEET_MAP[apiName] || apiName;
                // -> Added gd to mapped API results
                standingsMap[translatedName] = { 
                    w: teamRow.won, 
                    d: teamRow.draw, 
                    l: teamRow.lost, 
                    pts: teamRow.points, 
                    gd: teamRow.goalDifference || 0 
                };
              });
            });
            setLiveStandings(standingsMap);
          }
        } catch (err) {
          console.warn("Live API syncing failed.", err);
        }
    };

    fetchAllData();
    fetchLiveStandings();
  }, [router]);

  useEffect(() => {
    if (currentUserIsAdmin && adminEditMode && isViewingOther) {
      setPicks(allPicks[viewingUserId] || {});
    }
  }, [currentUserIsAdmin, adminEditMode, isViewingOther, allPicks, viewingUserId]);

  const handleSelect = (team: string, newRank: string) => {
    // Block edits if viewing someone else, unless admin edit mode is enabled
    if (isViewingOther && !(currentUserIsAdmin && adminEditMode)) return;
    if (isLocked && !(currentUserIsAdmin && adminEditMode)) return;
    
    const group = TOURNAMENT_GROUPS.find(g => g.teams.includes(team));
    if (!group) return;

    setPicks(prev => {
      const newPicks = { ...prev };
      if (newRank === '3Q') {
        const current3QCount = Object.entries(newPicks).filter(([t, r]) => r === '3Q' && t !== team).length;
        if (current3QCount >= 8) {
          alert('Limit Reached: You have already selected 8 advancing 3rd place teams (3Q).');
          return prev;
        }
      }

      const isThirdPlace = (rank: string) => rank === '3Q' || rank === '3';
      group.teams.forEach(otherTeam => {
        if (otherTeam !== team && newPicks[otherTeam]) {
          const otherRank = newPicks[otherTeam];
          if (otherRank === newRank || (isThirdPlace(newRank) && isThirdPlace(otherRank))) {
            delete newPicks[otherTeam];
          }
        }
      });
      newPicks[team] = newRank;
      return newPicks;
    });
  };

  const saveAndLockPicks = async () => {
    if (!user || (isViewingOther && !(currentUserIsAdmin && adminEditMode))) return;

    const targetUserIdToSave = isViewingOther && currentUserIsAdmin && adminEditMode ? viewingUserId : user.id;

    // The Prompt Modal
    const confirmSubmit = window.confirm(
      "Are you ready to lock in your Group Stage Bracket? Once submitted, your picks cannot be changed."
    );
    
    if (!confirmSubmit) return;

    setIsSaving(true);
    setSaveStatus('idle');

    const formattedPicks = Object.entries(picks).map(([team, placement]) => {
      const groupName = TOURNAMENT_GROUPS.find(g => g.teams.includes(team))?.name || 'Unknown';
      return { user_id: targetUserIdToSave, group_name: groupName, team_name: team, placement: placement };
    });

    try {
      // 1. Save Picks
      await supabase.from('phase_1_picks').delete().eq('user_id', targetUserIdToSave);
      if (formattedPicks.length > 0) {
        const { error } = await supabase.from('phase_1_picks').insert(formattedPicks);
        if (error) throw error;
      }
      
      // 2. Lock Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ group_picks_submitted: true, is_locked: true })
        .eq('id', targetUserIdToSave);

      if (profileError) throw profileError;

      // 3. Update UI states
      setAllPicks(prev => ({ ...prev, [targetUserIdToSave]: picks }));
      setIsLocked(true);
      setSaveStatus('success');
      
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const total3Q = Object.values(displayPicks).filter(rank => rank === '3Q').length;

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans pb-32">
      <div className="max-w-[1400px] mx-auto">

        {/* Global Scoring Constraints Banner */}
        <div className="max-w-3xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start space-x-4">
          <div className="mt-1 flex-shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h3 className="text-emerald-400 font-bold text-sm tracking-wide uppercase mb-1">Live Group Stage Active</h3>
            <p className="text-slate-400 text-sm">
              Records updated live. Official scoring after the final group match concludes.
            </p>
          </div>
        </div>

        {/* View Selection Dropdown */}
        <div className="max-w-3xl mx-auto mb-10 flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
           <div className="flex items-center space-x-3 w-full sm:w-auto">
             <label className="text-slate-400 font-bold text-sm uppercase tracking-wide">View Bracket:</label>
             <select
               className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none flex-grow"
               value={viewingUserId}
               onChange={(e) => setViewingUserId(e.target.value)}
             >
               {user && <option value={user.id}>🌟 My Picks </option>}
               <optgroup label="Pool Participants">
                 {profiles.filter(p => p.id !== user?.id).map(p => (
                   <option key={p.id} value={p.id}>{p.display_name || 'Unnamed Player'}</option>
                 ))}
               </optgroup>
             </select>
           </div>
           
           {isViewingOther && (
             <div className={`mt-3 sm:mt-0 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${adminEditMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
               {adminEditMode ? `🛠 Admin editing: ${activeProfile?.display_name}'s Bracket` : `🔒 READ ONLY: ${activeProfile?.display_name}'s Bracket`}
             </div>
           )}

           {currentUserIsAdmin && (
             <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row items-center gap-3 text-sm text-slate-300">
               <label className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={adminEditMode}
                   onChange={(e) => setAdminEditMode(e.target.checked)}
                   className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                 />
                 <span className="font-semibold">Admin edit mode</span>
               </label>
               <span className="text-slate-400 text-xs">Enable editing of locked picks.</span>
             </div>
           )}
        </div>

{/* The 12 Tournament Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {TOURNAMENT_GROUPS.map(group => {
            const sortedTeams = [...group.teams].sort((a, b) => {
              const recordA = liveStandings[a] || { w: 0, d: 0, l: 0, pts: 0, gd: 0 };
              const recordB = liveStandings[b] || { w: 0, d: 0, l: 0, pts: 0, gd: 0 };
              
              if (recordB.pts !== recordA.pts) return recordB.pts - recordA.pts; // 1. Points Tiebreaker
              if (recordB.gd !== recordA.gd) return recordB.gd - recordA.gd;     // 2. Goal Difference Tiebreaker
              if (recordB.w !== recordA.w) return recordB.w - recordA.w;         // 3. Wins Tiebreaker
              return 0;                                                          // 4. Default fallback
            });

            return (
              <div key={group.name} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
                <h2 className="text-lg font-bold text-emerald-400 mb-4">{group.name}</h2>
                <div className="space-y-4 flex-grow">
                  {sortedTeams.map((team, index) => {
                    const record = liveStandings[team] || { w: 0, d: 0, l: 0, pts: 0, gd: 0 };
                    
                    // Check if the dropdown should be disabled
                    const inputIsDisabled = (isViewingOther && !(currentUserIsAdmin && adminEditMode)) || (isLocked && !(currentUserIsAdmin && adminEditMode));
                    
                    // Determine match status for coloring based on live standings
                    const currentPick = displayPicks[team];
                    let isMatch = null;
                    if (currentPick) {
                      if (currentPick === '1' && index === 0) isMatch = true;
                      else if (currentPick === '2' && index === 1) isMatch = true;
                      else if ((currentPick === '3Q' || currentPick === '3') && index === 2) isMatch = true;
                      else if (currentPick === '4' && index === 3) isMatch = true;
                      else isMatch = false;
                    }

                    // Assign dynamic colors based on match accuracy
                    let selectColorClasses = 'border-slate-700 text-white'; // default
                    if (isMatch === true) {
                      selectColorClasses = 'border-emerald-500 text-emerald-400 font-bold bg-emerald-950/30';
                    } else if (isMatch === false) {
                      selectColorClasses = 'border-red-500 text-red-400 font-bold bg-red-950/30';
                    }

                    return (
                      <div key={team} className="flex flex-col justify-center bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                        <div className="flex justify-between items-center mb-2">
                          {/* Increased font size to text-base/text-lg for better readability */}
                          <span className="font-bold text-slate-100 text-base md:text-lg truncate pr-2">{team}</span>
                          
                          {/* Enlarged select input with dynamic color classes */}
                          <select 
                            disabled={inputIsDisabled}
                            className={`bg-slate-800 border-2 rounded-lg p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none w-32 disabled:opacity-70 disabled:cursor-not-allowed transition-colors ${selectColorClasses}`}
                            value={currentPick || ''}
                            onChange={(e) => handleSelect(team, e.target.value)}
                          >
                            <option value="" disabled>Rank</option>
                            <option value="1">1st</option>
                            <option value="2">2nd</option>
                            <option value="3Q">3Qual</option>
                            <option value="3">3Elim</option>
                            <option value="4">4</option>
                          </select>
                        </div>
                        {/* Increased record text size from xs to sm */}
                        <div className="flex justify-between items-center text-sm text-slate-400">
                          <span>W-D-L: {record.w}-{record.d}-{record.l}</span>
                          <span className="font-bold text-slate-300">{record.pts} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating 3Q Tracker */}
        <div className="flex justify-center mb-10">
          <div className={`px-6 py-3 rounded-full border shadow-xl flex items-center space-x-3 transition-colors ${
            total3Q === 8 ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}>
            <span className="font-bold tracking-widest uppercase text-xs">Advancing 3rd Place Teams (3Q)</span>
            <div className={`text-lg font-black px-3 py-1 rounded-full ${total3Q === 8 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'}`}>
              {total3Q} / 8
            </div>
          </div>
        </div>

        {/* Fixed Save Bar - Hidden when viewing others */}
        {!isViewingOther && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-4 z-40">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center">
              <div className="mb-3 sm:mb-0">
                {!user ? (
                  <span className="text-red-400 font-semibold text-sm">Please log in to save your rankings.</span>
                ) : saveStatus === 'success' ? (
                  <span className="text-emerald-400 font-semibold text-sm animate-pulse"> Picks successfully secured and locked!</span>
                ) : isLocked ? (
                   <span className="text-amber-400 font-semibold text-sm">🔒 Your picks are officially locked.</span>
                ) : (
                  <span className="text-slate-400 text-sm">Warning: Submitting will permanently lock your bracket.</span>
                )}
              </div>
              <button 
                onClick={saveAndLockPicks}
                disabled={isSaving || !user || (isLocked && !(currentUserIsAdmin && adminEditMode))}
                className={`font-bold py-3 px-10 rounded-full shadow-lg transition-colors disabled:opacity-50 w-full sm:w-auto ${
                  isLocked && !(currentUserIsAdmin && adminEditMode) ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isLocked && !(currentUserIsAdmin && adminEditMode) ? '🔒 Bracket Locked' : isSaving ? 'Locking in Database...' : 'Review & Submit Picks'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}