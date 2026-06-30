'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { API_TO_COMMON_MAP as API_MAP, INITIAL_KNOCKOUT_MATCHES, assignThirdPlaceTeams } from '../../lib/constants';
export const dynamic = 'force-dynamic';

export default function Simulator() {
  const [loading, setLoading] = useState(true);
  
  // Interactive Bracket State
  const [matches, setMatches] = useState<any[]>(INITIAL_KNOCKOUT_MATCHES);  
  const [champion, setChampion] = useState<string | null>(null);
  
  // Projection Data
  const [allPhase2Picks, setAllPhase2Picks] = useState<any[]>([]);
  const [baseScores, setBaseScores] = useState<any[]>([]); // Group Stage actuals
  const [projectedLeaderboard, setProjectedLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const initializeSimulator = async () => {
      let dynamicMatches = JSON.parse(JSON.stringify(INITIAL_KNOCKOUT_MATCHES));      

      const groupRanks: Record<string, string[]> = {};

      try {
        const [standingsRes, matchesRes, { data: profiles }, { data: p1Picks }, { data: p2Picks }] = await Promise.all([
          fetch('/api/standings', { cache: 'no-store' }),
          fetch('/api/matches', { cache: 'no-store' }),
          supabase.from('profiles').select('id, display_name'),
          supabase.from('phase_1_picks').select('user_id, team_name, placement').limit(10000),
          supabase.from('phase_2_picks').select('user_id, team_name, predicted_round').limit(10000)
        ]);

        if (p2Picks) setAllPhase2Picks(p2Picks);

        let currentStandings: Record<string, { rank: number }> = {};
        let advancingThirdPlace: string[] = [];

        if (standingsRes.ok) {
          const sData = await standingsRes.json();
          const thirds: any[] = [];
          
          // CRITICAL FIX: Ensure we use the projected standings for the simulator
          const groupStandings = sData.projectedStandings || sData.standings || [];
          
          groupStandings.forEach((group: any) => {
            const groupLetter = group.group.replace('GROUP_', '');
            
            // Build groupRanks mapping for the anchor logic
            const sorted = group.table.sort((a: any, b: any) => (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor));
            groupRanks[groupLetter] = sorted.map((t: any) => API_MAP[t.team.name] || t.team.name);

            group.table.forEach((row: any, index: number) => {
              const teamName = API_MAP[row.team.name] || row.team.name;
              currentStandings[teamName] = { rank: index + 1 };
              if (index === 2) thirds.push({ team: teamName, group: groupLetter, pts: row.points, gd: row.goalDifference, gf: row.goalsFor });
            });
          });

          // Sort and slice the top 8 advancing 3rd place teams
          thirds.sort((a,b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
          const top8Thirds = thirds.slice(0, 8).map(t => ({ team: t.team, group: t.group }));
          
          advancingThirdPlace = top8Thirds.map(t => t.team); // Used for Base P1 Points scoring

          // Run the chronological constraint solver matrix on the top 8 advancing 3rds
          const perfectAssignments = assignThirdPlaceTeams(top8Thirds);

          dynamicMatches = dynamicMatches.map((m: any) => {
            let newA = m.teamA; let newB = m.teamB;
            
            const match1stA = newA.match(/1st Place Group ([A-L])/);
            if(match1stA && groupRanks[match1stA[1]]) newA = groupRanks[match1stA[1]][0] || newA;
            const match2ndA = newA.match(/2nd Place Group ([A-L])/);
            if(match2ndA && groupRanks[match2ndA[1]]) newA = groupRanks[match2ndA[1]][1] || newA;
            const match1stB = newB.match(/1st Place Group ([A-L])/);
            if(match1stB && groupRanks[match1stB[1]]) newB = groupRanks[match1stB[1]][0] || newB;
            const match2ndB = newB.match(/2nd Place Group ([A-L])/);
            if(match2ndB && groupRanks[match2ndB[1]]) newB = groupRanks[match2ndB[1]][1] || newB;

            // Apply official Annex C routing for 3rd place teams
            if (perfectAssignments) {
              if (newA.includes('3Q Groups')) newA = perfectAssignments[m.id] || newA;
              if (newB.includes('3Q Groups')) newB = perfectAssignments[m.id] || newB;
            }

            return { ...m, teamA: newA, teamB: newB };
          });
        }

const initialScores = (profiles || []).map(profile => {
          let p1Points = 0;
          const userP1 = p1Picks?.filter(p => p.user_id === profile.id) || [];
          
          userP1.forEach(pick => {
            const liveTeamData = currentStandings[pick.team_name];
            if (!liveTeamData) return;

            // 1. ADVANCING POINTS (+3)
            const isActuallyAdvancing = liveTeamData.rank === 1 || liveTeamData.rank === 2 || advancingThirdPlace.includes(pick.team_name);
            const userPredictedAdvance = ['1', '2', '3Q'].includes(pick.placement);

            if (userPredictedAdvance && isActuallyAdvancing) { 
              p1Points += 3; 
            }
            
            // 2. STRICT EXACT PLACEMENT POINTS (+1 for ADVANCING TEAMS ONLY)
            let actualPlacementString = liveTeamData.rank.toString();
            if (liveTeamData.rank === 3) {
              actualPlacementString = advancingThirdPlace.includes(pick.team_name) ? '3Q' : '3';
            }

            // Must match the exact string AND the team must actually be advancing
            if (pick.placement === actualPlacementString && isActuallyAdvancing) { 
              p1Points += 1; 
            }
          });

          return { id: profile.id, name: profile.display_name || 'Unnamed', p1Points };
        });
        setBaseScores(initialScores);

        // STEP 2: Anchor Overwrite for Simulator
        if (matchesRes.ok) {
          const mData = await matchesRes.json();
          if (mData.matches && mData.matches.length > 0) {
            
            const r32Matches = mData.matches.filter((m: any) => m.stage === 'LAST_32');
            
            // CRITICAL FIX: Updated to match Wikipedia standard indices
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

            // Process all rounds to lock in finished games
            let simChamp = null;
            const processRound = (apiStageMatches: any[], roundStr: string) => {
                const roundMatches = dynamicMatches.filter((m: any) => m.round === roundStr);
                apiStageMatches.forEach((apiM, index) => {
                    const matchToUpdate = roundMatches[index];
                    if (matchToUpdate) {
                        const tA = apiM.homeTeam?.name; const tB = apiM.awayTeam?.name;
                        if (tA) matchToUpdate.teamA = API_MAP[tA] || tA;
                        if (tB) matchToUpdate.teamB = API_MAP[tB] || tB;

                        if (apiM.status === 'FINISHED') {
                            matchToUpdate.isFinished = true;
                            matchToUpdate.scoreA = apiM.score?.fullTime?.home ?? 0;
                            matchToUpdate.scoreB = apiM.score?.fullTime?.away ?? 0;
                            matchToUpdate.penaltiesA = apiM.score?.penalties?.home;
                            matchToUpdate.penaltiesB = apiM.score?.penalties?.away;

                            let winnerName = null;
                            if (apiM.score?.winner === 'HOME_TEAM') winnerName = apiM.homeTeam?.name;
                            else if (apiM.score?.winner === 'AWAY_TEAM') winnerName = apiM.awayTeam?.name;

                            if (winnerName) {
                                const formattedWinner = API_MAP[winnerName] || winnerName;
                                matchToUpdate.winner = formattedWinner;
                                matchToUpdate.actualWinner = formattedWinner;

                                if (matchToUpdate.nextMatchId) {
                                    const nextM = dynamicMatches.find((m: any) => m.id === matchToUpdate.nextMatchId);
                                    if (nextM) {
                                        if (matchToUpdate.slot === 'home') nextM.teamA = formattedWinner;
                                        else nextM.teamB = formattedWinner;
                                    }
                                } else if (roundStr === 'F') {
                                    simChamp = formattedWinner;
                                }
                            }
                        } else if (apiM.status === 'IN_PLAY' || apiM.status === 'PAUSED') {
                            matchToUpdate.isLive = true;
                            matchToUpdate.scoreA = apiM.score?.fullTime?.home ?? 0;
                            matchToUpdate.scoreB = apiM.score?.fullTime?.away ?? 0;
                        }
                    }
                });
            };

            processRound(r32Matches, 'R32');
            processRound(mData.matches.filter((m: any) => m.stage === 'LAST_16'), 'R16');
            processRound(mData.matches.filter((m: any) => m.stage === 'QUARTER_FINALS'), 'QF');
            processRound(mData.matches.filter((m: any) => m.stage === 'SEMI_FINALS'), 'SF');
            processRound(mData.matches.filter((m: any) => m.stage === 'FINAL'), 'F');
            setChampion(simChamp);
          }
        }
      } catch(e) { console.warn("Simulation Init Error", e); }

      setMatches(dynamicMatches);
      setLoading(false);
    };

    initializeSimulator();
  }, []);

  // Recalculate Leaderboard whenever matches state changes
  useEffect(() => {
    if (baseScores.length === 0) return;

    const PHASE_2_WEIGHTS: Record<string, number> = { 'R32': 3, 'R16': 7, 'QF': 15, 'SF': 20, 'CHAMPION': 25 };

    const projected = baseScores.map(user => {
      let p2Points = 0;
      const userPicks = allPhase2Picks.filter(p => p.user_id === user.id);

      userPicks.forEach(pick => {
        const round = pick.predicted_round;
        const pts = PHASE_2_WEIGHTS[round];
        if (pts) {
          if (round === 'CHAMPION') {
            if (champion === pick.team_name) p2Points += pts;
          } else {
            const matchWon = matches.find(m => m.round === round && m.winner === pick.team_name);
            if (matchWon) p2Points += pts;
          }
        }
      });

      return { ...user, projectedTotal: user.p1Points + p2Points, projectedP2: p2Points };
    });

    projected.sort((a, b) => b.projectedTotal - a.projectedTotal);
    setProjectedLeaderboard(projected);
  }, [matches, champion, baseScores, allPhase2Picks]);

  const handlePick = (matchId: number, selectedTeam: string) => {
    if (!selectedTeam) return;
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch || currentMatch.isFinished) return; // Can't rewrite finished real games

    const isUnselecting = currentMatch.winner === selectedTeam;

    setMatches(prevMatches => {
      // Safe deep-copy so we can walk down the tree modifying future rounds
      let bracket = JSON.parse(JSON.stringify(prevMatches));
      const target = bracket.find((m: any) => m.id === matchId);
      const oldWinner = target.winner;

      if (isUnselecting) {
        // --- CASE 1: UNSELECTING A TEAM ---
        target.winner = null;
        if (target.round === 'F') setChampion(null);

        // Walk downstream and scrub this team from any future matches it was pushed into
        let curr = target;
        while (curr.nextMatchId) {
          const nextM = bracket.find((m: any) => m.id === curr.nextMatchId);
          if (!nextM || nextM.isFinished) break;

          if (curr.slot === 'home') nextM.teamA = '';
          else nextM.teamB = '';

          if (nextM.winner === selectedTeam) {
            nextM.winner = null;
            if (nextM.round === 'F') setChampion(null);
            curr = nextM; // Move pointer to the next round to keep scrubbing
          } else {
            break;
          }
        }
      } else {
        // --- CASE 2: SELECTING OR SWITCHING A TEAM ---
        target.winner = selectedTeam;
        if (target.round === 'F') setChampion(selectedTeam);

        // If a different team was already sitting here, scrub the old team's downstream trail first
        if (oldWinner) {
          let curr = target;
          while (curr.nextMatchId) {
            const nextM = bracket.find((m: any) => m.id === curr.nextMatchId);
            if (!nextM || nextM.isFinished) break;

            if (curr.slot === 'home') nextM.teamA = '';
            else nextM.teamB = '';

            if (nextM.winner === oldWinner) {
              nextM.winner = null;
              if (nextM.round === 'F') setChampion(null);
              curr = nextM;
            } else {
              break;
            }
          }
        }

        // Now push our NEW winner into the immediate next round
        if (target.nextMatchId) {
          const nextM = bracket.find((m: any) => m.id === target.nextMatchId);
          if (nextM && !nextM.isFinished) {
            if (target.slot === 'home') nextM.teamA = selectedTeam;
            else nextM.teamB = selectedTeam;
            nextM.winner = null; // Reset next match's winner because the matchup just changed
          }
        }
      }

      return bracket;
    });
  };

  const renderRound = (roundName: string, title: string) => {
    const roundMatches = matches.filter(m => m.round === roundName);

    return (
      <div className="flex flex-col space-y-4 min-w-[250px]">
        <h3 className="text-center font-bold text-slate-500 uppercase tracking-widest text-xs mb-2 sticky top-0 bg-slate-950 py-2 z-10">
          {title}
        </h3>
        {roundMatches.map(match => {
          
          const renderButton = (teamName: string, slotScore: number, slotPens: number | undefined) => {
            const isSelected = match.winner === teamName;
            const isRealWinner = match.isFinished && match.actualWinner === teamName;
            const isRealLoser = match.isFinished && match.actualWinner !== teamName;
            
            let btnClass = 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-transparent';
            
            if (isRealWinner) {
              btnClass = 'bg-emerald-900/60 border-emerald-500/50 text-emerald-400 cursor-default shadow-[0_0_10px_rgba(16,185,129,0.1)]';
            } else if (isRealLoser) {
              btnClass = 'bg-slate-900/50 text-slate-600 border border-slate-800/50 cursor-default opacity-60';
            } else if (isSelected) {
              btnClass = 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.1)]';
            } else if (!teamName || match.isFinished) {
              btnClass = 'bg-slate-800/30 text-slate-700 border border-transparent cursor-not-allowed';
            }

            return (
              <button
                onClick={() => handlePick(match.id, teamName)}
                disabled={match.isFinished || !teamName}
                className={`w-full flex justify-between items-center p-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${btnClass}`}
              >
                <div className="flex flex-col items-start truncate">
                  <span className={`truncate pr-2 ${isRealLoser ? 'line-through text-slate-500' : ''}`}>{teamName || 'TBD'}</span>
                  {match.isLive && <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest animate-pulse mt-0.5">Live</span>}
                </div>
                
                {(match.isFinished || match.isLive) && slotScore !== undefined && slotScore !== null && (
                  <div className={`font-mono text-sm px-2 py-0.5 rounded ${isRealWinner ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-950 text-slate-500'}`}>
                    {slotScore} {slotPens !== undefined && <span className="text-[9px] ml-1">({slotPens})</span>}
                  </div>
                )}
              </button>
            );
          };

          return (
            <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 space-y-1.5 relative">
              {renderButton(match.teamA, match.scoreA, match.penaltiesA)}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800 -z-10"></div>
              {renderButton(match.teamB, match.scoreB, match.penaltiesB)}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex justify-center items-center text-sky-500 font-bold tracking-widest animate-pulse">LOADING SIMULATOR...</div>;
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-slate-950 text-slate-200 font-sans pb-24">
      <div className="max-w-[1600px] mx-auto">
        
        <header className="mb-10 flex flex-col items-center text-center">          
          <h1 className="text-4xl font-black text-sky-500 mb-2 tracking-tight">Knockout Simulator</h1>
          <p className="text-slate-400 max-w-2xl text-sm mb-6">
            Click pending match-ups to project winners and instantly see how the leaderboard shifts (at bottom of page). 
          </p>
          <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500"></span> Actual Winner</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-500/30 border border-sky-500"></span> Projected Winner</div>
          </div>
        </header>

        {/* Layout Grid: Bracket on Top, Leaderboard Below */}
        <div className="space-y-10">
          
          {/* BRACKET SECTION */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex space-x-6 sm:space-x-8 overflow-x-auto pb-6 items-start hide-scrollbar">
              {renderRound('R32', 'Round of 32')}
              {renderRound('R16', 'Round of 16')}
              {renderRound('QF', 'Quarterfinals')}
              {renderRound('SF', 'Semifinals')}
              {renderRound('F', 'Final Match')}

              <div className="flex flex-col min-w-[240px]">
                <h3 className="text-center font-bold text-amber-500 uppercase tracking-widest text-xs mb-2 sticky top-0 bg-slate-950 py-2 z-10">Champion</h3>
                <div className={`p-8 rounded-2xl text-center border transition-all duration-500 flex items-center justify-center min-h-[120px] ${
                  champion ? 'bg-sky-500/10 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.1)] scale-105' : 'bg-slate-900 border-slate-800 border-dashed'
                }`}>
                  {champion ? <div className="text-2xl font-black text-sky-400 tracking-wide">{champion}</div> : <div className="text-slate-600 font-medium">Awaiting Finalist</div>}
                </div>
              </div>
            </div>
          </div>

          {/* PROJECTED LEADERBOARD SECTION */}
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-sky-950/30 border-b border-sky-500/20 p-4">
              <h2 className="text-lg font-black text-sky-400 uppercase tracking-widest text-center">Live Projected Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left">
                <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold w-16 text-center">Rank</th>
                    <th className="px-4 py-3 font-bold">Player</th>
                    <th className="px-4 py-3 font-bold text-center text-slate-500 border-l border-slate-800/50">Base Pts</th>
                    <th className="px-4 py-3 font-bold text-center text-sky-500 border-r border-slate-800/50">Proj. Pts</th>
                    <th className="px-6 py-3 font-black text-white text-right text-sm">Hypothetical Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {projectedLeaderboard.map((user, index) => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                          index === 0 ? 'bg-sky-500 text-slate-900' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-white text-sm">{user.name}</td>
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-sm border-l border-slate-800/50">{user.p1Points}</td>
                      <td className="px-4 py-3 text-center text-sky-400 font-mono text-sm border-r border-slate-800/50">+{user.projectedP2}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-black text-lg text-white">{user.projectedTotal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}