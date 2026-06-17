'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// GLOBAL DEADLINES
const GROUP_STAGE_END_TIME = new Date('2026-06-28T00:10:00-04:00').getTime();
const KNOCKOUT_START_TIME = new Date('2026-06-28T15:00:00-04:00').getTime();

const TEAM_TO_GROUP: Record<string, string> = {
  'Czechia': 'A', 'Mexico': 'A', 'South Africa': 'A', 'South Korea': 'A',
  'Bosnia & Herzigovina': 'B', 'Canada': 'B', 'Switzerland': 'B', 'Qatar': 'B',
  'Brazil': 'C', 'Haiti': 'C', 'Morocco': 'C', 'Scotland': 'C',
  'Australia': 'D', 'Paraguay': 'D', 'Turkey': 'D', 'United States': 'D',
  'Curacao': 'E', 'Ecuador': 'E', 'Germany': 'E', 'Ivory Coast': 'E',
  'Japan': 'F', 'Netherlands': 'F', 'Sweden': 'F', 'Tunisia': 'F',
  'Belgium': 'G', 'Egypt': 'G', 'Iran': 'G', 'New Zealand': 'G',
  'Cape Verde': 'H', 'Saudi Arabia': 'H', 'Spain': 'H', 'Uruguay': 'H',
  'France': 'I', 'Iraq': 'I', 'Norway': 'I', 'Senegal': 'I',
  'Algeria': 'J', 'Argentina': 'J', 'Austria': 'J', 'Jordan': 'J',
  'Colombia': 'K', 'DR Congo': 'K', 'Portugal': 'K', 'Uzbekistan': 'K',
  'Croatia': 'L', 'England': 'L', 'Ghana': 'L', 'Panama': 'L'
};

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

function resolveThirdPlaceMatrix(advancingThirds: any[]) {
  const slots = [
    { matchId: 1, allowed: ['C', 'D', 'E'] }, { matchId: 3, allowed: ['A', 'B', 'F'] },
    { matchId: 5, allowed: ['G', 'H', 'I'] }, { matchId: 7, allowed: ['J', 'K', 'L'] },
    { matchId: 9, allowed: ['A', 'C', 'D'] }, { matchId: 11, allowed: ['B', 'E', 'F'] },
    { matchId: 13, allowed: ['G', 'I', 'J'] }, { matchId: 15, allowed: ['H', 'K', 'L'] },
  ];
  let assignments: Record<number, string> = {};

  function solve(index: number): boolean {
    if (index === slots.length) return true;
    const slot = slots[index];
    for (let i = 0; i < advancingThirds.length; i++) {
      const t = advancingThirds[i];
      if (!t.used && slot.allowed.includes(t.group)) {
        t.used = true;
        assignments[slot.matchId] = t.team;
        if (solve(index + 1)) return true;
        t.used = false;
        delete assignments[slot.matchId];
      }
    }
    return false;
  }
  solve(0);
  return assignments;
}

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
  
  // Time and Lock States
  const [isBracketFinalized, setIsBracketFinalized] = useState(false);
  const [isGlobalKnockoutTimeLocked, setIsGlobalKnockoutTimeLocked] = useState(false);
  
  // Security States
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [isUserLocked, setIsUserLocked] = useState(false);

  const targetUserId = viewingUserId || user?.id;
  const isViewingOther = targetUserId && targetUserId !== user?.id;

  // Real-time Deadline Enforcer
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
      try {
        const apiRes = await fetch('/api/standings');
        if (apiRes.ok) {
          const data = await apiRes.json();
          const groups = data.standings.filter((s: any) => s.type === 'TOTAL');
          let firsts: Record<string, string> = {};
          let seconds: Record<string, string> = {};
          let thirds: any[] = [];
          
          groups.forEach((group: any) => {
            group.table.forEach((row: any, idx: number) => {
              const apiName = row.team.name;
              const API_MAP: Record<string, string> = { "United States": "United States", "USA": "United States", "Bosnia and Herzegovina": "Bosnia & Herzigovina", "Czech Republic": "Czechia", "Korea Republic": "South Korea", "Congo DR": "DR Congo", "Côte d'Ivoire": "Ivory Coast", "Cabo Verde": "Cape Verde" };
              const teamName = API_MAP[apiName] || apiName;
              const groupLetter = TEAM_TO_GROUP[teamName];
              
              const displayName = teamName;

              if (idx === 0) firsts[groupLetter] = displayName;
              if (idx === 1) seconds[groupLetter] = displayName;
              if (idx === 2) thirds.push({ group: groupLetter, team: displayName, pts: row.points, gd: row.goalDifference, used: false });
            });
          });

          thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
          const advancingThirds = thirds.slice(0, 8);
          const mappedThirds = resolveThirdPlaceMatrix(advancingThirds);

          dynamicMatches = dynamicMatches.map((m: any) => {
            let newA = m.teamA;
            let newB = m.teamB;
            if (m.teamA.includes('1st Place Group')) newA = firsts[m.teamA.slice(-1)] || m.teamA;
            if (m.teamA.includes('2nd Place Group')) newA = seconds[m.teamA.slice(-1)] || m.teamA;
            if (m.teamB.includes('2nd Place Group')) newB = seconds[m.teamB.slice(-1)] || m.teamB;
            if (m.teamB.includes('3Q') && mappedThirds[m.id]) newB = mappedThirds[m.id];
            return { ...m, teamA: newA, teamB: newB };
          });
        }
      } catch(e) { console.warn("API load failed"); }

      setBaseBracket(dynamicMatches);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setViewingUserId(session.user.id);

        const userProfile = profileData?.find(p => p.id === session.user.id);
        if (userProfile) {
          setIsUserLocked(userProfile.knockout_picks_submitted || false);
        }

        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
        if (roleData?.role === 'admin') {
          setCurrentUserIsAdmin(true);
        }
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
    const inputIsDisabled = isViewingOther || ( (isGlobalKnockoutTimeLocked || isUserLocked) && !currentUserIsAdmin );
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
    if (!hasUnsavedChanges || isViewingOther || !user) return;
    if (Date.now() >= KNOCKOUT_START_TIME && !currentUserIsAdmin) return;

    const timer = setTimeout(() => {
      performSilentSave();
    }, 1000); // Saves 1 second after user finishes their last click/typing

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
      await supabase.from('phase_2_picks').delete().eq('user_id', user.id);
      
      if (picksToInsert.length > 0) {
        const { error } = await supabase.from('phase_2_picks').insert(picksToInsert);
        if (error) throw error;
      }
      
      setAllPhase2Picks(prev => [...prev.filter(p => p.user_id !== user.id), ...picksToInsert]);
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
    if (name.includes('Place') || name.includes('3Q') || isBracketFinalized) return name;
    return `${name} (Prelim)`;
  };

  const renderRound = (roundName: string, title: string) => {
    const roundMatches = matches.filter(m => m.round === roundName);
    const inputIsDisabled = isViewingOther || ( (isGlobalKnockoutTimeLocked || isUserLocked) && !currentUserIsAdmin );

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
          <h1 className="text-4xl font-black tracking-tight text-white mb-3 text-center">World Cup 2026 Knockout Bracket</h1>
          
          <div className="flex flex-col items-center mb-6 space-y-3">
            {isGlobalKnockoutTimeLocked ? (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 shadow-lg">
                 <span>🔒 Global Knockout Lock In Effect</span>
              </div>
            ) : isBracketFinalized ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 shadow-lg">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span>Knockout Bracket Finalized and Open for Picks</span>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 text-slate-400 px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 shadow-lg text-center">
                 <span>⏳ Bracket Pending: The final bracket will unlock for official picks on June 28, 2026, at 12:10 AM ET.</span>
              </div>
            )}
            
            <div className={`border px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 max-w-2xl text-center shadow-lg ${
              isGlobalKnockoutTimeLocked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <span>⚠️ The official review window opens June 28 at 12:10 AM ET. All picks must be finalized and locked in before the 3:00 PM ET deadline.</span>
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
               <div className="mt-3 sm:mt-0 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                 🔒 READ ONLY: {activeProfile?.display_name}'s Bracket
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
                <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-full flex items-center space-x-3 shadow-lg">
                  {(isGlobalKnockoutTimeLocked || isUserLocked) && !currentUserIsAdmin ? (
                    <span className="text-amber-500 font-bold text-sm">🔒 Bracket is Locked</span>
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
        </header>

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
                 disabled={isViewingOther || ( (isGlobalKnockoutTimeLocked || isUserLocked) && !currentUserIsAdmin )}
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