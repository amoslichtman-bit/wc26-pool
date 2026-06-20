'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
export const dynamic = 'force-dynamic';
// GLOBAL DEADLINES
const GROUP_STAGE_END_TIME = new Date('2026-06-28T00:10:00-04:00').getTime();
const KNOCKOUT_START_TIME = new Date('2026-06-28T15:00:00-04:00').getTime();

const INITIAL_MATCHES = [
  { id: 1, round: 'R32', nextMatchId: 17, slot: 'home', teamA: '1st Place Group A', teamB: '3Q Groups C/D/E', winner: null },
  { id: 2, round: 'R32', nextMatchId: 17, slot: 'away', teamA: '2nd Place Group B', teamB: '2nd Place Group C', winner: null },
  { id: 3, round: 'R32', nextMatchId: 18, slot: 'home', teamA: '1st Place Group D', teamB: '3Q Groups A/B/F', winner: null },
  { id: 4, round: 'R32', nextMatchId: 18, slot: 'away', teamA: '2nd Place Group E', teamB: '2nd Place Group F', winner: null },
  { id: 5, round: 'R32', nextMatchId: 19, slot: 'home', teamA: '1st Place Group G', teamB: '3Q Groups G/H/I', winner: null },
  { id: 6, round: 'R32', nextMatchId: 19, slot: 'away', teamA: '2nd Place Group H', teamB: '2nd Place Group I', winner: null },
  { id: 7, round: 'R32', nextMatchId: 20, slot: 'home', teamA: '1st Place Group J', teamB: '3Q Groups J/K/L', winner: null },
  { id: 8, round: 'R32', nextMatchId: 20, slot: 'away', teamA: '2nd Place Group K', teamB: '2nd Place Group L', winner: null },
  { id: 9, round: 'R32', nextMatchId: 21, slot: 'home', teamA: '1st Place Group B', teamB: '3Q Groups A/C/D', winner: null },
  { id: 10, round: 'R32', nextMatchId: 21, slot: 'away', teamA: '1st Place Group C', teamB: '2nd Place Group A', winner: null },
  { id: 11, round: 'R32', nextMatchId: 22, slot: 'home', teamA: '1st Place Group E', teamB: '3Q Groups B/E/F', winner: null },
  { id: 12, round: 'R32', nextMatchId: 22, slot: 'away', teamA: '1st Place Group F', teamB: '2nd Place Group D', winner: null },
  { id: 13, round: 'R32', nextMatchId: 23, slot: 'home', teamA: '1st Place Group H', teamB: '3Q Groups G/I/J', winner: null },
  { id: 14, round: 'R32', nextMatchId: 23, slot: 'away', teamA: '1st Place Group I', teamB: '2nd Place Group G', winner: null },
  { id: 15, round: 'R32', nextMatchId: 24, slot: 'home', teamA: '1st Place Group K', teamB: '3Q Groups H/K/L', winner: null },
  { id: 16, round: 'R32', nextMatchId: 24, slot: 'away', teamA: '1st Place Group L', teamB: '2nd Place Group J', winner: null },
  { id: 17, round: 'R16', nextMatchId: 25, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 18, round: 'R16', nextMatchId: 25, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 19, round: 'R16', nextMatchId: 26, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 20, round: 'R16', nextMatchId: 26, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 21, round: 'R16', nextMatchId: 27, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 22, round: 'R16', nextMatchId: 27, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 23, round: 'R16', nextMatchId: 28, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 24, round: 'R16', nextMatchId: 28, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 25, round: 'QF', nextMatchId: 29, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 26, round: 'QF', nextMatchId: 29, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 27, round: 'QF', nextMatchId: 30, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 28, round: 'QF', nextMatchId: 30, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 29, round: 'SF', nextMatchId: 31, slot: 'home', teamA: '', teamB: '', winner: null },
  { id: 30, round: 'SF', nextMatchId: 31, slot: 'away', teamA: '', teamB: '', winner: null },
  { id: 31, round: 'F', nextMatchId: null, slot: null, teamA: '', teamB: '', winner: null },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>(INITIAL_MATCHES);   
  const [baseBracket, setBaseBracket] = useState<any[]>([]); 
  const [champion, setChampion] = useState<string | null>(null);
  const [tiebreakerScore, setTiebreakerScore] = useState<string>('');
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allPhase2Picks, setAllPhase2Picks] = useState<any[]>([]);
  
  const [viewingUserId, setViewingUserId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Time States
  const [isBracketFinalized, setIsBracketFinalized] = useState(false);
  const [isGlobalKnockoutTimeLocked, setIsGlobalKnockoutTimeLocked] = useState(false);
  
  // Security States
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [adminEditMode, setAdminEditMode] = useState(false);

  // Global View Logic
  const targetUserId = viewingUserId || user?.id;
  const isViewingOther = targetUserId && targetUserId !== user?.id;
  const inputIsDisabled = isViewingOther && !(currentUserIsAdmin && adminEditMode);

  // Real-time Deadline Enforcer for UI labels
  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      setIsBracketFinalized(now >= GROUP_STAGE_END_TIME);
      setIsGlobalKnockoutTimeLocked(now >= KNOCKOUT_START_TIME);
    };
    
    checkTime(); 
    const timer = setInterval(checkTime, 10000); 
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      const { data: profileData } = await supabase.from('profiles').select('id, display_name, email, knockout_picks_submitted').order('display_name');
      if (profileData) setProfiles(profileData);

      const { data: allPicksData } = await supabase.from('phase_2_picks').select('*').limit(10000);
      if (allPicksData) setAllPhase2Picks(allPicksData);

      let dynamicMatches = JSON.parse(JSON.stringify(INITIAL_MATCHES));
      
      const API_MAP: Record<string, string> = { 
        "United States": "United States", "USA": "United States", 
        "Bosnia and Herzegovina": "Bosnia & Herzigovina", "Bosnia-Herzegovina": "Bosnia & Herzigovina", 
        "Czech Republic": "Czechia", "Korea Republic": "South Korea", 
        "Congo DR": "DR Congo", "Côte d'Ivoire": "Ivory Coast", 
        "Cabo Verde": "Cape Verde", "Cape Verde Islands": "Cape Verde", "Curaçao": "Curacao" 
      };
      try {
        // STEP 1: Predict Knockout Teams based on current live standings
        // Add { cache: 'no-store' } to bypass aggressive caching
        const standingsRes = await fetch('/api/standings', { cache: 'no-store' });
        if (standingsRes.ok) {
          const sData = await standingsRes.json();
          const groupRanks: Record<string, string[]> = {};
          const thirds: any[] = [];
          
          // ... (existing groupStandings logic remains unchanged) ...
        
          
          const groupStandings = sData.standings?.filter((s: any) => s.type === 'TOTAL') || [];
          groupStandings.forEach((group: any) => {
            const groupLetter = group.group.replace('GROUP_', '');
            const sorted = group.table.sort((a: any, b: any) => (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor));
            
            groupRanks[groupLetter] = sorted.map((t: any) => API_MAP[t.team.name] || t.team.name);
            if(sorted[2]) {
              thirds.push({ team: groupRanks[groupLetter][2], group: groupLetter, pts: sorted[2].points, gd: sorted[2].goalDifference, gf: sorted[2].goalsFor });
            }
          });

          thirds.sort((a,b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
          const top8Thirds = thirds.slice(0, 8);

          dynamicMatches = dynamicMatches.map((m: any) => {
            let newA = m.teamA;
            let newB = m.teamB;
            
            const match1stA = newA.match(/1st Place Group ([A-L])/);
            if(match1stA && groupRanks[match1stA[1]]) newA = groupRanks[match1stA[1]][0] || newA;
            
            const match2ndA = newA.match(/2nd Place Group ([A-L])/);
            if(match2ndA && groupRanks[match2ndA[1]]) newA = groupRanks[match2ndA[1]][1] || newA;

            const match1stB = newB.match(/1st Place Group ([A-L])/);
            if(match1stB && groupRanks[match1stB[1]]) newB = groupRanks[match1stB[1]][0] || newB;
            
            const match2ndB = newB.match(/2nd Place Group ([A-L])/);
            if(match2ndB && groupRanks[match2ndB[1]]) newB = groupRanks[match2ndB[1]][1] || newB;

            if (newA.includes('3Q Groups')) {
              const groups = newA.replace('3Q Groups ', '').split('/');
              const availableThird = top8Thirds.find((t: any) => groups.includes(t.group));
              if (availableThird) newA = availableThird.team;
            }
            if (newB.includes('3Q Groups')) {
              const groups = newB.replace('3Q Groups ', '').split('/');
              const availableThird = top8Thirds.find((t: any) => groups.includes(t.group));
              if (availableThird) newB = availableThird.team;
            }
            return { ...m, teamA: newA, teamB: newB };
          });
        }

        // STEP 2: Overwrite projections with actual official match data if the API provides it
// Add { cache: 'no-store' } to bypass aggressive caching
        const apiRes = await fetch('/api/matches', { cache: 'no-store' });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.matches && data.matches.length > 0) {
            const r32Matches = data.matches.filter((m: any) => m.stage === 'LAST_32');
            dynamicMatches = dynamicMatches.map((m: any) => {
              if (m.round === 'R32' && r32Matches[m.id - 1]) {
                const apiMatch = r32Matches[m.id - 1];
                const rawTeamA = apiMatch.homeTeam?.name;
                const rawTeamB = apiMatch.awayTeam?.name;
                if (rawTeamA) m.teamA = API_MAP[rawTeamA] || rawTeamA;
                if (rawTeamB) m.teamB = API_MAP[rawTeamB] || rawTeamB;
              }
              return m;
            });
          }
        }
      } catch(e) { 
        console.warn("API load failed", e); 
      }

      setBaseBracket(dynamicMatches);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setViewingUserId(session.user.id);
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
        if (roleData?.role === 'admin') setCurrentUserIsAdmin(true);
      }
    };

    initializeApp();
  }, [router]);

  useEffect(() => {
    if (baseBracket.length === 0) return;

    if (!targetUserId) {
      setMatches(baseBracket);
      setChampion(null);
      setTiebreakerScore('');
      return;
    }

    const userPicks = allPhase2Picks.filter(p => p.user_id === targetUserId);

    if (userPicks.length > 0) {
      let freshMatches = JSON.parse(JSON.stringify(baseBracket));
      let finalChamp = null;
      let finalTiebreak = '';

      const roundOrder: { [key: string]: number } = { 'R32': 1, 'R16': 2, 'QF': 3, 'SF': 4, 'F': 5, 'CHAMPION': 6, 'TIEBREAKER': 7 };
      const sortedPicks = userPicks.sort((a, b) => (roundOrder[a.predicted_round] || 0) - (roundOrder[b.predicted_round] || 0));

      sortedPicks.forEach(pick => {
        if (pick.predicted_round === 'CHAMPION') { finalChamp = pick.team_name; return; }
        if (pick.predicted_round === 'TIEBREAKER') { finalTiebreak = pick.team_name; return; }

        const matchToWin = freshMatches.find((m: any) => m.round === pick.predicted_round && (m.teamA === pick.team_name || m.teamB === pick.team_name));
        if (matchToWin) {
          matchToWin.winner = pick.team_name;
          if (matchToWin.nextMatchId) {
            const nextMatch = freshMatches.find((m: any) => m.id === matchToWin.nextMatchId);
            if (nextMatch) {
              if (matchToWin.slot === 'home') nextMatch.teamA = pick.team_name;
              else nextMatch.teamB = pick.team_name;
            }
          }
        }
      });
      setMatches(freshMatches);
      setChampion(finalChamp);
      setTiebreakerScore(finalTiebreak);
    } else {
      setMatches(baseBracket);
      setChampion(null);
      setTiebreakerScore('');
    }
  }, [viewingUserId, targetUserId, allPhase2Picks, baseBracket]);

  const handlePick = (matchId: number, selectedTeam: string) => {
    if (!selectedTeam || inputIsDisabled) return;
    
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    if (currentMatch.round === 'F') setChampion(selectedTeam);

    setMatches(prevMatches => {
      return prevMatches.map(match => {
        if (match.id === matchId) return { ...match, winner: selectedTeam };
        if (match.id === currentMatch.nextMatchId) {
          if (currentMatch.slot === 'home') return { ...match, teamA: selectedTeam, winner: null };
          else return { ...match, teamB: selectedTeam, winner: null };
        }
        return match;
      });
    });
    setHasUnsavedChanges(true);
  };

  // Debounced Auto-Save
  useEffect(() => {
    if (!hasUnsavedChanges || (!currentUserIsAdmin && isViewingOther) || !user) return;

    const timer = setTimeout(() => {
      performSilentSave();
    }, 1000); 

    return () => clearTimeout(timer);
  }, [matches, champion, tiebreakerScore, hasUnsavedChanges]);

  const performSilentSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    const completedPicks = matches.filter(m => m.winner !== null);
    const picksToInsert = completedPicks.map(match => ({
      user_id: user.id, team_name: match.winner, predicted_round: match.round
    }));

    if (champion) picksToInsert.push({ user_id: user.id, team_name: champion, predicted_round: 'CHAMPION' });
    if (tiebreakerScore.trim() !== '') picksToInsert.push({ user_id: user.id, team_name: tiebreakerScore, predicted_round: 'TIEBREAKER' });

    try {
      const saveUserId = isViewingOther && currentUserIsAdmin && adminEditMode ? targetUserId : user.id;
      await supabase.from('phase_2_picks').delete().eq('user_id', saveUserId);
      
      if (picksToInsert.length > 0) {
        const { error } = await supabase.from('phase_2_picks').insert(picksToInsert.map(p => ({ ...p, user_id: saveUserId })));
        if (error) throw error;
      }
      
      setAllPhase2Picks(prev => [...prev.filter(p => p.user_id !== saveUserId), ...picksToInsert.map(p => ({ ...p, user_id: saveUserId }))]);
      setSaveStatus('success');
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const formatTeamName = (name: string) => {
    if (!name) return 'TBD';
    return name;
  };

  const renderRound = (roundName: string, title: string) => {
    const roundMatches = matches.filter(m => m.round === roundName);

    return (
      <div className="flex flex-col space-y-4 min-w-[250px]">
        <h3 className="text-center font-bold text-slate-500 uppercase tracking-widest text-xs mb-2 sticky top-0 bg-slate-950 py-2 z-10">
          {title}
        </h3>
        {roundMatches.map(match => (
          <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 space-y-1.5 relative">
            <button
              onClick={() => handlePick(match.id, match.teamA)}
              disabled={!match.teamA || match.teamA.includes('Place') || match.teamA.includes('3Q') || inputIsDisabled}
              className={`w-full flex justify-between items-center p-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                match.winner === match.teamA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : match.teamA && !match.teamA.includes('Place') && !match.teamA.includes('3Q') && !inputIsDisabled
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-transparent' 
                  : 'bg-slate-800/50 text-slate-700 border border-transparent cursor-not-allowed'
              }`}
            >
              <span className="truncate pr-2">{formatTeamName(match.teamA)}</span>
            </button>

            <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800 -z-10"></div>

            <button
              onClick={() => handlePick(match.id, match.teamB)}
              disabled={!match.teamB || match.teamB.includes('Place') || match.teamB.includes('3Q') || inputIsDisabled}
              className={`w-full flex justify-between items-center p-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                match.winner === match.teamB ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : match.teamB && !match.teamB.includes('Place') && !match.teamB.includes('3Q') && !inputIsDisabled
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-transparent' 
                  : 'bg-slate-800/50 text-slate-700 border border-transparent cursor-not-allowed'
              }`}
            >
              <span className="truncate pr-2">{formatTeamName(match.teamB)}</span>
            </button>
          </div>
        ))}
      </div>
    );
  };

  const activeProfile = profiles.find(p => p.id === viewingUserId);

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        <header className="mb-8 flex flex-col items-center">          
          <div className="flex flex-col items-center mb-6 space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-lg text-sm flex flex-col items-center shadow-lg text-center max-w-3xl gap-3">
              <span className="font-bold">
                ⚠️ This bracket is a companion to Ted's Google Sheets and does not replace any of you Google Sheets duties. Picks remain open here, but your official picks must be locked in the spreadsheet before the knockout stage begins.
              </span>
              
              {!isBracketFinalized ? (
                <span className="text-xs font-medium text-amber-200/80">
                  Teams currently shown are preliminary projections. The bracket will refresh with the actual knockout round teams when the group stage ends.
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-400">
                  Group stage complete. The bracket is now populated with official matchups.
                </span>
              )}
              
              <span className="text-xs font-bold mt-1 bg-amber-500/20 px-3 py-1.5 rounded-md border border-amber-500/30">
                Official Finalized Bracket Window: June 28 at 12:10 AM ET — June 28 at 3:00 PM ET
              </span>
            </div>
          </div>

          <div className="max-w-3xl w-full mb-6 flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
             <div className="flex items-center space-x-3 w-full sm:w-auto">
               <label className="text-slate-400 font-bold text-sm uppercase tracking-wide">View Bracket:</label>
               <select
                 className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none flex-grow"
                 value={viewingUserId}
                 onChange={(e) => setViewingUserId(e.target.value)}
               >
                 {user && <option value={user.id}>🌟 My Bracket </option>}
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
          </div>

          {!isViewingOther && (
            <div className="h-14 flex justify-center items-center">
              {!user ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-3">
                  <span>You must be logged in to save your bracket.</span>
                  <a href="/login" className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors">Log In</a>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-full flex flex-col sm:flex-row items-center gap-3 shadow-lg">
                  {isGlobalKnockoutTimeLocked ? (
                    <span className="text-amber-500 font-bold text-sm">🗓️ Official Lock Time Passed (Picks remain editable here)</span>
                  ) : isSaving ? (
                    <span className="text-slate-400 font-bold text-sm animate-pulse">🔄 Saving changes...</span>
                  ) : saveStatus === 'success' ? (
                    <span className="text-emerald-400 font-bold text-sm">✓ All changes saved automatically</span>
                  ) : (
                    <span className="text-slate-500 font-bold text-sm">✓ Changes save automatically</span>
                  )}
                </div>
              )}
            </div>
          )}

          {currentUserIsAdmin && (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 text-sm text-slate-300">
              <label className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminEditMode}
                  onChange={(e) => setAdminEditMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="font-semibold">Admin edit mode</span>
              </label>
              <span className="text-slate-400 text-xs">Enable editing of other players' brackets.</span>
            </div>
          )}
        </header>

        {/* --- STATUS LABEL --- */}
        <div className="flex justify-center mb-4">
          {!isBracketFinalized ? (
            <div className="px-5 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Preliminary Projections
            </div>
          ) : (
            <div className="px-5 py-2 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Official Finalized Bracket
            </div>
          )}
        </div>

        <div className="flex space-x-6 sm:space-x-8 overflow-x-auto pb-12 pt-4 px-2 sm:px-4 items-start min-h-[75vh] hide-scrollbar border-t border-slate-800/50">
          {renderRound('R32', 'Round of 32')}
          {renderRound('R16', 'Round of 16')}
          {renderRound('QF', 'Quarterfinals')}
          {renderRound('SF', 'Semifinals')}
          {renderRound('F', 'Final Match')}

          <div className="flex flex-col min-w-[240px]">
            <h3 className="text-center font-bold text-amber-500 uppercase tracking-widest text-xs mb-6 sticky top-0 bg-slate-950 py-2 z-10">Champion</h3>
            <div className={`p-8 rounded-2xl text-center border shadow-2xl transition-all duration-500 mb-6 ${
              champion ? 'bg-amber-500/10 border-amber-500/50 shadow-amber-500/10 scale-105' : 'bg-slate-900 border-slate-800 border-dashed'
            }`}>
              {champion ? <div className="text-2xl font-black text-amber-400 tracking-wide">{formatTeamName(champion)}</div> : <div className="text-slate-600 font-medium py-8">Awaiting Finalist</div>}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center shadow-lg">
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Final Match Tiebreaker</label>
               <input 
                 type="text" 
                 placeholder="Score (e.g. 2-1)" 
                 value={tiebreakerScore}
                 onChange={(e) => {
                   setTiebreakerScore(e.target.value);
                   setHasUnsavedChanges(true);
                 }}
                 disabled={inputIsDisabled}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-white focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
               />
               <p className="text-[10px] text-slate-500 mt-2">Predict the exact score at the end of regulation/extra time.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}