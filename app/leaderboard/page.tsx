'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { API_TO_COMMON_MAP } from '../../lib/constants';
export const dynamic = 'force-dynamic';

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isGroupStageFinalized, setIsGroupStageFinalized] = useState(false);

  useEffect(() => {
    // Automatically swap the banner 10 minutes after the final group stage game ends
    const groupStageEndTime = new Date('2026-06-28T00:10:00-04:00').getTime();
    const now = new Date().getTime();
    setIsGroupStageFinalized(now >= groupStageEndTime);

    const buildLeaderboard = async () => {
      try {
        let currentStandings: Record<string, { rank: number, pts: number, gd: number, gf: number }> = {};
        let advancingThirdPlace: string[] = [];
        
        let actualKnockoutResults: Record<string, string[]> = {
          'R32': [], 'R16': [], 'QF': [], 'SF': [], 'CHAMPION': []
        };

        // 1. Fetch Group Stage Standings (with no-store to beat aggressive cache)
        const apiRes = await fetch('/api/standings', { cache: 'no-store' });
        if (apiRes.ok) {
          const liveData = await apiRes.json();
          const thirdPlaceTeams: { team: string, pts: number, gd: number, gf: number }[] = [];

          if (liveData.standings) {
            const groups = liveData.standings.filter((s: any) => s.type === 'TOTAL');
            groups.forEach((group: any) => {
              group.table.forEach((row: any, index: number) => {
                const apiName = row.team.name;
                const teamName = API_TO_COMMON_MAP[apiName] || apiName;
                
                const rank = index + 1;
                currentStandings[teamName] = { rank, pts: row.points, gd: row.goalDifference, gf: row.goalsFor || 0 };
                // Added gf to tiebreaker math
                if (rank === 3) thirdPlaceTeams.push({ team: teamName, pts: row.points, gd: row.goalDifference, gf: row.goalsFor || 0 });
              });
            });
          }
          // Sort explicitly matches Phase 1 logic now
          thirdPlaceTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
          advancingThirdPlace = thirdPlaceTeams.slice(0, 8).map(t => t.team);
        }

        // 2. Fetch Knockout Matches to properly populate actualKnockoutResults
        const matchesRes = await fetch('/api/matches', { cache: 'no-store' });
        if (matchesRes.ok) {
          const mData = await matchesRes.json();
          if (mData.matches) {
            mData.matches.forEach((match: any) => {
              if (match.status === 'FINISHED') {
                let winner = null;
                // Football-data.org natively handles penalty shootouts in score.winner
                if (match.score?.winner === 'HOME_TEAM') winner = match.homeTeam?.name;
                else if (match.score?.winner === 'AWAY_TEAM') winner = match.awayTeam?.name;
                
                if (winner) {
                  winner = API_TO_COMMON_MAP[winner] || winner;
                  
                  if (match.stage === 'LAST_32') actualKnockoutResults['R32'].push(winner);
                  else if (match.stage === 'LAST_16') actualKnockoutResults['R16'].push(winner);
                  else if (match.stage === 'QUARTER_FINALS') actualKnockoutResults['QF'].push(winner);
                  else if (match.stage === 'SEMI_FINALS') actualKnockoutResults['SF'].push(winner);
                  else if (match.stage === 'FINAL') actualKnockoutResults['CHAMPION'].push(winner);
                }
              }
            });
          }
        }

        // 3. Score Users
        const { data: profiles } = await supabase.from('profiles').select('id, display_name');
        const { data: p1Picks } = await supabase.from('phase_1_picks').select('user_id, team_name, placement').limit(10000);
        const { data: p2Picks } = await supabase.from('phase_2_picks').select('user_id, team_name, predicted_round').limit(10000);

        if (!profiles) return;

        const scores = profiles.map(profile => {
          let p1Points = 0;
          let correctAdvancing = 0;
          let exactPlacements = 0;
          
          let p2Total = 0;
          let p2RoundScores = { 'R32': 0, 'R16': 0, 'QF': 0, 'SF': 0, 'CHAMPION': 0 };

          const userP1 = p1Picks?.filter(p => p.user_id === profile.id) || [];
          userP1.forEach(pick => {
            const liveTeamData = currentStandings[pick.team_name];
            if (!liveTeamData) return;

            // 1. ADVANCING POINTS (+3)
            const isActuallyAdvancing = liveTeamData.rank === 1 || liveTeamData.rank === 2 || advancingThirdPlace.includes(pick.team_name);
            const userPredictedAdvance = ['1', '2', '3Q'].includes(pick.placement);

            if (userPredictedAdvance && isActuallyAdvancing) { 
              p1Points += 3; 
              correctAdvancing += 1; 
            }
            
            // 2. STRICT EXACT PLACEMENT POINTS (+1 for ADVANCING TEAMS ONLY)
            let actualPlacementString = liveTeamData.rank.toString();
            if (liveTeamData.rank === 3) {
              actualPlacementString = advancingThirdPlace.includes(pick.team_name) ? '3Q' : '3';
            }

            // Must match the exact string AND the team must actually be advancing
            if (pick.placement === actualPlacementString && isActuallyAdvancing) { 
              p1Points += 1; 
              exactPlacements += 1; 
            }
          });

          const PHASE_2_WEIGHTS: Record<string, number> = {
            'R32': 3, 'R16': 7, 'QF': 15, 'SF': 20, 'CHAMPION': 25 
          };

          const userP2 = p2Picks?.filter(p => p.user_id === profile.id) || [];
          userP2.forEach(pick => {
            const round = pick.predicted_round;
            const pointsAvailable = PHASE_2_WEIGHTS[round];

            if (pointsAvailable && actualKnockoutResults[round]?.includes(pick.team_name)) {
              p2Total += pointsAvailable;
              p2RoundScores[round as keyof typeof p2RoundScores] += pointsAvailable;
            }
          });

          return {
            id: profile.id,
            name: profile.display_name || 'Unnamed Player',
            totalPoints: p1Points + p2Total,
            p1Points, correctAdvancing, exactPlacements,
            p2RoundScores
          };
        });

        scores.sort((a, b) => b.totalPoints - a.totalPoints);
        setLeaderboard(scores);

      } catch (error) {
        console.error("Leaderboard Error:", error);
      } finally {
        setLoading(false);
      }
    };

    buildLeaderboard();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex justify-center items-center text-emerald-500 font-bold tracking-widest animate-pulse">CALCULATING SCORES...</div>;
  }

  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-200 font-sans pb-32">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-black text-amber-500 mb-3 tracking-tight">Global Leaderboard</h1>
          
          <div className={`inline-flex items-center space-x-2 border px-4 py-2 rounded-full text-sm font-bold mb-4 ${
            isGroupStageFinalized 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
          }`}>
            <span className="relative flex h-2.5 w-2.5">
              {!isGroupStageFinalized && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isGroupStageFinalized ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span>{isGroupStageFinalized ? 'GROUP STAGE SCORING FINALIZED' : 'PRELIMINARY (GROUP STAGE) SCORING ACTIVE'}</span>
          </div>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-bold w-12 text-center">Rank</th>
                  <th className="px-4 py-3 font-bold">Player</th>
                  
                  {/* Consolidated Group Stage Column */}
                  <th className="px-3 py-3 font-bold text-center border-x border-slate-800/50 leading-tight text-xs">
                    Group Stage<br/>
                    <span className="text-[10px] text-emerald-500/70 font-normal normal-case tracking-normal">Pts</span>
                  </th>
                  
                  <th className="px-2 py-3 font-bold text-center text-slate-500 leading-tight text-xs">R16<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+3)</span></th>
                  <th className="px-2 py-3 font-bold text-center text-slate-500 leading-tight text-xs">QF<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+7)</span></th>
                  <th className="px-2 py-3 font-bold text-center text-slate-500 leading-tight text-xs">SF<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+15)</span></th>
                  <th className="px-2 py-3 font-bold text-center text-slate-500 leading-tight text-xs">F<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+20)</span></th>
                  <th className="px-2 py-3 font-bold text-center text-slate-500 leading-tight text-xs">CHAMP<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+25)</span></th>
                  
                  <th className="sticky right-0 px-4 py-3 font-black text-white text-right text-sm border-l border-slate-800/50 bg-slate-950/80 backdrop-blur z-10">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {leaderboard.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                        index === 0 ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                        index === 1 ? 'bg-slate-300 text-slate-900' :
                        index === 2 ? 'bg-orange-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{user.name}</td>
                    
                    {/* Consolidated Group Stage Cell */}
                    <td className="px-3 py-3 text-center text-slate-200 font-mono font-bold text-sm border-x border-slate-800/50 bg-slate-900/30">
                      {user.p1Points}
                    </td>
                    
                    <td className="px-2 py-3 text-center text-slate-300 font-mono text-sm">
                      {user.p2RoundScores['R32']}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-300 font-mono text-sm">
                      {user.p2RoundScores['R16']}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-300 font-mono text-sm">
                      {user.p2RoundScores['QF']}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-300 font-mono text-sm">
                      {user.p2RoundScores['SF']}
                    </td>
                    <td className="px-2 py-3 text-center text-amber-500 font-mono text-sm font-semibold">
                      {user.p2RoundScores['CHAMPION']}
                    </td>

                    <td className="sticky right-0 px-4 py-3 text-right border-l border-slate-800/50 bg-slate-950/80 backdrop-blur z-10">
                      <span className="font-black text-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">{user.totalPoints}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}