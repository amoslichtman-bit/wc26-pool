'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { API_TO_COMMON_MAP as API_MAP, INITIAL_KNOCKOUT_MATCHES, assignThirdPlaceTeams } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// GLOBAL DEADLINES
const GROUP_STAGE_END_TIME = new Date('2026-06-28T00:10:00-04:00').getTime();
const KNOCKOUT_START_TIME = new Date('2026-06-28T15:00:00-04:00').getTime();

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // User's Interactive Bracket State initialized with the corrected structure
  const [matches, setMatches] = useState<any[]>(INITIAL_KNOCKOUT_MATCHES);   
  const [baseBracket, setBaseBracket] = useState<any[]>([]); 
  const [champion, setChampion] = useState<string | null>(null);
  const [tiebreakerScore, setTiebreakerScore] = useState<string>('');
  
  // Real-Life Tournament Data (For March Madness Visual Scoring)
  const [actualBracket, setActualBracket] = useState<any[]>([]);
  const [actualChampion, setActualChampion] = useState<string | null>(null);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());
  
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

  // Global View Logic (Companion Mode: stays unlocked unless viewing others)
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

      let dynamicMatches = JSON.parse(JSON.stringify(INITIAL_KNOCKOUT_MATCHES));
      const groupRanks: Record<string, string[]> = {};

      try {
        // STEP 1: Predict Preliminary Knockout Teams based on live group standings
        const standingsRes = await fetch('/api/standings', { cache: 'no-store' });
        if (standingsRes.ok) {
          const sData = await standingsRes.json();
          const thirds: any[] = [];
          
          // CRITICAL: We grab projectedStandings so our preliminary bracket simulates realistic full 3-game group outcomes!
          const groupStandings = sData.projectedStandings || sData.standings || [];
          
          groupStandings.forEach((group: any) => {
            const groupLetter = group.group.replace('GROUP_', '');
            const sorted = group.table.sort((a: any, b: any) => (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor));
            
            groupRanks[groupLetter] = sorted.map((t: any) => API_MAP[t.team.name] || t.team.name);
            if (sorted[2]) {
              thirds.push({ team: groupRanks[groupLetter][2], group: groupLetter, pts: sorted[2].points, gd: sorted[2].goalDifference, gf: sorted[2].goalsFor });
            }
          });

          thirds.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
          const top8Thirds = thirds.slice(0, 8).map(t => ({ team: t.team, group: t.group }));

          // Run the chronological constraint solver matrix on the top 8 advancing 3rds
          const perfectAssignments = assignThirdPlaceTeams(top8Thirds);

          dynamicMatches = dynamicMatches.map((m: any) => {
            let newA = m.teamA;
            let newB = m.teamB;
            
            const match1stA = newA.match(/1st Place Group ([A-L])/);
            if (match1stA && groupRanks[match1stA[1]]) newA = groupRanks[match1stA[1]][0] || newA;
            
            const match2ndA = newA.match(/2nd Place Group ([A-L])/);
            if (match2ndA && groupRanks[match2ndA[1]]) newA = groupRanks[match2ndA[1]][1] || newA;

            const match1stB = newB.match(/1st Place Group ([A-L])/);
            if (match1stB && groupRanks[match1stB[1]]) newB = groupRanks[match1stB[1]][0] || newB;
            
            const match2ndB = newB.match(/2nd Place Group ([A-L])/);
            if (match2ndB && groupRanks[match2ndB[1]]) newB = groupRanks[match2ndB[1]][1] || newB;

            // Map resolved 3rd place teams safely using the dictionary returned by the backend solver
            if (perfectAssignments) {
              if (newA.includes('3Q Groups')) newA = perfectAssignments[m.id] || newA;
              if (newB.includes('3Q Groups')) newB = perfectAssignments[m.id] || newB;
            }

            return { ...m, teamA: newA, teamB: newB };
          });
        }

        // STEP 2: Anchor Overwrite - Use undisputed 1st/2nd place facts to pull true official API matchups
        const apiRes = await fetch('/api/matches', { cache: 'no-store' });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.matches && data.matches.length > 0) {
            
            const r32Matches = data.matches.filter((m: any) => m.stage === 'LAST_32');
            
            // Map the undisputed positions to their specific updated index structures matching Wikipedia
            const R32_ANCHORS: Record<number, string> = {
              1: groupRanks['E']?.[0], 2: groupRanks['I']?.[0], 3: groupRanks['A']?.[1], 4: groupRanks['F']?.[0],
              5: groupRanks['C']?.[0], 6: groupRanks['E']?.[1], 7: groupRanks['A']?.[0], 8: groupRanks['L']?.[0],
              9: groupRanks['K']?.[1], 10: groupRanks['H']?.[0], 11: groupRanks['D']?.[0], 12: groupRanks['G']?.[0],
              13: groupRanks['J']?.[0], 14: groupRanks['D']?.[1], 15: groupRanks['B']?.[0], 16: groupRanks['K']?.[0],
            };

            dynamicMatches = dynamicMatches.map((m: any) => {
              if (m.round === 'R32') {
                const anchorTeam = R32_ANCHORS[m.id];
                if (anchorTeam) {
                  const matchingApiGame = r32Matches.find((apiM: any) => {
                    const tHome = API_MAP[apiM.homeTeam?.name] || apiM.homeTeam?.name;
                    const tAway = API_MAP[apiM.awayTeam?.name] || apiM.awayTeam?.name;
                    return tHome === anchorTeam || tAway === anchorTeam;
                  });

                  if (matchingApiGame) {
                    const rawHome = matchingApiGame.homeTeam?.name;
                    const rawAway = matchingApiGame.awayTeam?.name;
                    if (rawHome) m.teamA = API_MAP[rawHome] || rawHome;
                    if (rawAway) m.teamB = API_MAP[rawAway] || rawAway;
                  }
                }
              }
              return m;
            });

            // Build the Real-Life Tournament Simulation Tree
            let realMatches = JSON.parse(JSON.stringify(dynamicMatches));
            let elimSet = new Set<string>();
            let realChamp = null;

            const processStage = (apiStageMatches: any[], roundString: string) => {
                if (!apiStageMatches || apiStageMatches.length === 0) return;
                const roundMatches = realMatches.filter((m: any) => m.round === roundString);

                apiStageMatches.forEach((apiM, index) => {
                    if (apiM.status === 'FINISHED' && roundMatches[index]) {
                        let winnerName = null; let loserName = null;

                        if (apiM.score?.winner === 'HOME_TEAM') {
                            winnerName = apiM.homeTeam?.name; loserName = apiM.awayTeam?.name;
                        } else if (apiM.score?.winner === 'AWAY_TEAM') {
                            winnerName = apiM.awayTeam?.name; loserName = apiM.homeTeam?.name;
                        }

                        if (loserName) elimSet.add(API_MAP[loserName] || loserName);

                        if (winnerName) {
                            const formattedWinner = API_MAP[winnerName] || winnerName;
                            const matchToUpdate = roundMatches[index];
                            matchToUpdate.winner = formattedWinner;

                            if (matchToUpdate.nextMatchId) {
                                const nextM = realMatches.find((m: any) => m.id === matchToUpdate.nextMatchId);
                                if (nextM) {
                                    if (matchToUpdate.slot === 'home') nextM.teamA = formattedWinner;
                                    else nextM.teamB = formattedWinner;
                                }
                            } else if (roundString === 'F') {
                                realChamp = formattedWinner;
                            }
                        }
                    }
                });
            };

            processStage(r32Matches, 'R32');
            processStage(data.matches.filter((m: any) => m.stage === 'LAST_16'), 'R16');
            processStage(data.matches.filter((m: any) => m.stage === 'QUARTER_FINALS'), 'QF');
            processStage(data.matches.filter((m: any) => m.stage === 'SEMI_FINALS'), 'SF');
            processStage(data.matches.filter((m: any) => m.stage === 'FINAL'), 'F');

            setActualBracket(realMatches);
            setEliminatedTeams(elimSet);
            setActualChampion(realChamp);
          }
        }
      } catch (e) { 
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
    if (name.includes('Place') || name.includes('3Q') || isBracketFinalized) return name;
    return `${name} (Prelim)`;
  };

  const renderRound = (roundName: string, title: string) => {
    const roundMatches = matches.filter(m => m.round === roundName);

    return (
      <div className="flex flex-col space-y-4 min-w-[250px]">
        <h3 className="text-center font-bold text-slate-500 uppercase tracking-widest text-xs mb-2 sticky top-0 bg-slate-950 py-2 z-10">
          {title}
        </h3>
        {roundMatches.map(match => {
          const actualMatch = actualBracket.find(m => m.id === match.id);
          const isMatchFinished = actualMatch && actualMatch.winner !== null;

          const renderButtonContent = (teamName: string) => {
            const isSelected = match.winner === teamName;
            const isBtnDisabled = !teamName || teamName.includes('Place') || teamName.includes('3Q') || inputIsDisabled;

            let btnClass = 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-transparent';
            let content = <span className="truncate pr-2">{formatTeamName(teamName)}</span>;

            if (isSelected) {
              if (isMatchFinished) {
                  if (actualMatch.winner === teamName) {
                      // Correct Pick (Green)
                      btnClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';
                      content = (
                          <div className="flex flex-col text-left truncate">
                              <span className="truncate pr-2 font-bold">{formatTeamName(teamName)}</span>
                              <span className="text-[9px] text-emerald-500 uppercase tracking-wider font-black">✓ Correct</span>
                          </div>
                      );
                  } else {
                      // Incorrect Pick (Red Strikethrough + Actual Winner below)
                      btnClass = 'bg-red-500/10 text-red-400 border border-red-500/30';
                      content = (
                          <div className="flex flex-col text-left truncate">
                              <span className="truncate pr-2 line-through opacity-60">{formatTeamName(teamName)}</span>
                              <span className="text-[10px] text-emerald-400 font-bold mt-0.5 leading-tight">Real: {actualMatch.winner}</span>
                          </div>
                      );
                  }
              } else if (eliminatedTeams.has(teamName)) {
                  // Pending match, but team is mathematically busted
                  btnClass = 'bg-red-500/10 text-red-400 border border-red-500/30';
                  content = (
                      <div className="flex flex-col text-left truncate">
                          <span className="truncate pr-2 line-through opacity-60">{formatTeamName(teamName)}</span>
                          <span className="text-[9px] text-red-500 font-bold mt-0.5 uppercase tracking-wider">Eliminated</span>
                      </div>
                  );
              } else {
                  // Selected and alive (Sky Blue)
                  btnClass = 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.1)]';
                  content = <span className="truncate pr-2 font-bold">{formatTeamName(teamName)}</span>;
              }
            } else if (isBtnDisabled) {
                btnClass = 'bg-slate-800/50 text-slate-700 border border-transparent cursor-not-allowed';
            }

            return (
              <button
                onClick={() => handlePick(match.id, teamName)}
                disabled={isBtnDisabled}
                className={`w-full flex justify-between items-center p-2 rounded-lg text-xs transition-all duration-200 ${btnClass}`}
              >
                {content}
              </button>
            );
          };

          return (
            <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 space-y-1.5 relative">
              {renderButtonContent(match.teamA)}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800 -z-10"></div>
              {renderButtonContent(match.teamB)}
            </div>
          );
        })}
      </div>
    );
  };

  const activeProfile = profiles.find(p => p.id === viewingUserId);

  // Champion Box March Madness Visuals
  let champClass = 'bg-slate-900 border-slate-800 border-dashed';
  let champContent = <div className="text-slate-600 font-medium py-8">Awaiting Finalist</div>;

  if (champion) {
      if (actualChampion) {
          if (actualChampion === champion) {
              champClass = 'bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-105';
              champContent = (
                  <div className="flex flex-col items-center py-4">
                      <span className="text-2xl font-black text-emerald-400 tracking-wide">{formatTeamName(champion)}</span>
                      <span className="text-xs text-emerald-500 font-black uppercase tracking-widest mt-2">✓ Correct Champion</span>
                  </div>
              );
          } else {
              champClass = 'bg-red-500/10 border border-red-500/30 scale-105';
              champContent = (
                  <div className="flex flex-col items-center py-4">
                      <span className="text-2xl font-black text-red-400/60 tracking-wide line-through">{formatTeamName(champion)}</span>
                      <span className="text-sm text-emerald-400 font-bold uppercase tracking-widest mt-2">Real: {actualChampion}</span>
                  </div>
              );
          }
      } else if (eliminatedTeams.has(champion)) {
           champClass = 'bg-red-500/10 border border-red-500/30 scale-105';
           champContent = (
               <div className="flex flex-col items-center py-4">
                   <span className="text-2xl font-black text-red-400/60 tracking-wide line-through">{formatTeamName(champion)}</span>
                   <span className="text-xs text-red-500 font-bold uppercase tracking-widest mt-2">Eliminated</span>
               </div>
           );
      } else {
           champClass = 'bg-sky-500/10 border border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.1)] scale-105';
           champContent = <div className="text-2xl font-black text-sky-400 tracking-wide py-4">{formatTeamName(champion)}</div>;
      }
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans pb-24">
      <div className="max-w-[1600px] mx-auto">
        
        {/* --- COMPANION & WARNING HEADER --- */}
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-2xl text-sm flex flex-col items-center shadow-2xl text-center max-w-3xl mx-auto gap-2.5 mb-8">
          <span className="font-extrabold text-base text-amber-300">
            ⚠️ Ted's Google Sheets Companion Bracket
          </span>
          <span className="text-slate-300 leading-relaxed">
            This bracket is meant as a companion tool and does not replace your official Google Sheets duties. Picks remain open here, but your official picks must be locked in the spreadsheet before the knockout stage begins.
          </span>
          <div className="h-px bg-amber-500/20 w-full my-0.5"></div>
          {!isBracketFinalized ? (
            <div className="flex flex-col gap-2">
              <span className="text-amber-200/90 font-medium">
                🚨 <strong className="text-white uppercase tracking-wider font-bold">Preliminary Status:</strong> Matchups currently displayed are best-guess baseline projections. Because FIFA's new 12-group matrix has 495 possible tiebreaker combinations, our live mid-game projections may temporarily differ from major sports networks. 
              </span>
              <span className="text-amber-200/90 font-medium text-sm">
                This bracket will permanently auto-correct and lock in the official matchups the moment the Group Stage concludes.
                <a href="https://www.bbc.co.uk/sport/football/world-cup/schedule" target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-2 text-sky-400 hover:text-sky-300 underline font-bold transition-colors">
                  Compare with BBC's live tracker ↗
                </a>
              </span>
            </div>
          ) : (
            <span className="text-emerald-400 font-bold">
              ✅ <strong className="text-white uppercase tracking-wider font-bold">Official Matchups Active:</strong> Group stage complete. The bracket is now fully populated with official matchups.
            </span>
          )}
          <span className="text-xs font-mono bg-amber-500/20 text-amber-200 px-3 py-1 rounded-md border border-amber-500/30 mt-1">
            Official Finalized Bracket Window: June 28 at 12:10 AM ET — June 28 at 3:00 PM ET
          </span>
        </div>

        {/* View Selection Dropdown */}
        <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
           <div className="flex items-center space-x-3 w-full sm:w-auto">
             <label className="text-slate-400 font-bold text-sm uppercase tracking-wide">View Bracket:</label>
             <select
               className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none flex-grow font-semibold"
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

        {/* Save Bar & Admin Overrides */}
        <div className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isViewingOther && (
            <div className="w-full sm:w-auto flex justify-center">
              {!user ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-3">
                  <span>You must be logged in to save your bracket.</span>
                  <a href="/login" className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors">Log In</a>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-lg">
                  {isSaving ? (
                    <span className="text-slate-400 font-bold text-xs animate-pulse">🔄 Silently saving picks...</span>
                  ) : saveStatus === 'success' ? (
                    <span className="text-emerald-400 font-bold text-xs">✓ All changes secured to database</span>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs">✓ Cloud auto-save active</span>
                  )}
                </div>
              )}
            </div>
          )}

          {currentUserIsAdmin && (
            <div className="flex items-center gap-3 text-xs text-slate-300 mx-auto sm:mx-0">
              <label className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={adminEditMode}
                  onChange={(e) => setAdminEditMode(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="font-bold text-amber-400/90">Admin edit override</span>
              </label>
            </div>
          )}
        </div>

        {/* --- DYNAMIC BRACKET STATUS BADGE --- */}
        <div className="flex justify-center mb-6">
          {!isBracketFinalized ? (
            <div className="px-6 py-2 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2.5 shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Preliminary Bracket Projections Active
            </div>
          ) : (
            <div className="px-6 py-2 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2.5 shadow-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Official Finalized Knockout Bracket
            </div>
          )}
        </div>

        {/* Tournament Tree Grids */}
        <div className="flex space-x-6 sm:space-x-8 overflow-x-auto pb-12 pt-2 px-2 sm:px-4 items-start min-h-[75vh] hide-scrollbar border-t border-slate-800/50">
          {renderRound('R32', 'Round of 32')}
          {renderRound('R16', 'Round of 16')}
          {renderRound('QF', 'Quarterfinals')}
          {renderRound('SF', 'Semifinals')}
          {renderRound('F', 'Final Match')}

          <div className="flex flex-col min-w-[240px]">
            <h3 className="text-center font-bold text-amber-500 uppercase tracking-widest text-xs mb-2 sticky top-0 bg-slate-950 py-2 z-10">Champion</h3>
            <div className={`rounded-2xl text-center transition-all duration-500 mb-6 flex flex-col justify-center min-h-[110px] shadow-2xl ${champClass}`}>
              {champContent}
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
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-white focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-bold"
               />
               <p className="text-[10px] text-slate-500 mt-2">Predict the exact score at the end of regulation/extra time.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}