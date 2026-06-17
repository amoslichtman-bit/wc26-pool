'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Add this line to disable caching for this page
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
        let currentStandings: Record<string, { rank: number, pts: number, gd: number }> = {};
        let advancingThirdPlace: string[] = [];
        
        let actualKnockoutResults: Record<string, string[]> = {
          'R32': [], 'R16': [], 'QF': [], 'SF': [], 'CHAMPION': []
        };

        const apiRes = await fetch('/api/standings');
        if (apiRes.ok) {
          const liveData = await apiRes.json();
          const thirdPlaceTeams: { team: string, pts: number, gd: number }[] = [];

          if (liveData.standings) {
            const groups = liveData.standings.filter((s: any) => s.type === 'TOTAL');
            groups.forEach((group: any) => {
              group.table.forEach((row: any, index: number) => {
                const apiName = row.team.name;
                const API_TO_SHEET_MAP: Record<string, string> = {
                  "United States": "United States", "USA": "United States",
                  "Bosnia and Herzegovina": "Bosnia & Herzigovina", "Czech Republic": "Czechia",
                  "Korea Republic": "South Korea", "Congo DR": "DR Congo",
                  "Côte d'Ivoire": "Ivory Coast", "Cabo Verde": "Cape Verde"
                };
                const teamName = API_TO_SHEET_MAP[apiName] || apiName;
                
                const rank = index + 1;
                currentStandings[teamName] = { rank, pts: row.points, gd: row.goalDifference };
                if (rank === 3) thirdPlaceTeams.push({ team: teamName, pts: row.points, gd: row.goalDifference });
              });
            });
          }
          thirdPlaceTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
          advancingThirdPlace = thirdPlaceTeams.slice(0, 8).map(t => t.team);
        }

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

            const isActuallyAdvancing = liveTeamData.rank === 1 || liveTeamData.rank === 2 || advancingThirdPlace.includes(pick.team_name);
            const userPredictedAdvance = ['1', '2', '3Q'].includes(pick.placement);

            if (userPredictedAdvance && isActuallyAdvancing) { p1Points += 3; correctAdvancing += 1; }
            
            let predictedNumericRank = parseInt(pick.placement.replace('Q', ''));
            if (predictedNumericRank === liveTeamData.rank) { p1Points += 1; exactPlacements += 1; }
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
      <div className="max-w-6xl mx-auto">
        
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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] whitespace-nowrap text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-5 font-bold w-16 text-center">Rank</th>
                  <th className="px-6 py-5 font-bold">Player</th>
                  
                  <th className="px-3 py-5 font-bold text-center border-l border-slate-800/50 leading-tight">Group Stage<br/>Advancing<br/><span className="text-[9px] text-emerald-500/70 lowercase tracking-normal">(+3/ea &bull; max 96)</span></th>
                  <th className="px-3 py-5 font-bold text-center border-r border-slate-800/50 leading-tight">Group Stage<br/>Exact<br/><span className="text-[9px] text-amber-500/70 lowercase tracking-normal">(+1/ea &bull; max 48)</span></th>
                  
                  <th className="px-2 py-5 font-bold text-center text-slate-500 leading-tight">R16<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+3/ea &bull; max 48)</span></th>
                  <th className="px-2 py-5 font-bold text-center text-slate-500 leading-tight">QF<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+7/ea &bull; max 56)</span></th>
                  <th className="px-2 py-5 font-bold text-center text-slate-500 leading-tight">SF<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+15/ea &bull; max 60)</span></th>
                  <th className="px-2 py-5 font-bold text-center text-slate-500 leading-tight">F<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+20/ea &bull; max 40)</span></th>
                  <th className="px-2 py-5 font-bold text-center text-slate-500 leading-tight">CHAMP<br/><span className="text-[9px] text-slate-600 lowercase tracking-normal">(+25 &bull; max 25)</span></th>
                  
                  <th className="px-6 py-5 font-black text-white text-right text-base border-l border-slate-800/50">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {leaderboard.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                        index === 1 ? 'bg-slate-300 text-slate-900' :
                        index === 2 ? 'bg-orange-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white text-lg">{user.name}</td>
                    
                    <td className="px-3 py-4 text-center text-slate-300 font-mono border-l border-slate-800/50">
                      {user.correctAdvancing * 3} <span className="text-[10px] text-slate-600">/ 96</span>
                    </td>
                    <td className="px-3 py-4 text-center text-slate-300 font-mono border-r border-slate-800/50">
                      {user.exactPlacements} <span className="text-[10px] text-slate-600">/ 48</span>
                    </td>
                    
                    <td className="px-2 py-4 text-center text-slate-300 font-mono">
                      {user.p2RoundScores['R32']} <span className="text-[10px] text-slate-700">/ 48</span>
                    </td>
                    <td className="px-2 py-4 text-center text-slate-300 font-mono">
                      {user.p2RoundScores['R16']} <span className="text-[10px] text-slate-700">/ 56</span>
                    </td>
                    <td className="px-2 py-4 text-center text-slate-300 font-mono">
                      {user.p2RoundScores['QF']} <span className="text-[10px] text-slate-700">/ 60</span>
                    </td>
                    <td className="px-2 py-4 text-center text-slate-300 font-mono">
                      {user.p2RoundScores['SF']} <span className="text-[10px] text-slate-700">/ 40</span>
                    </td>
                    <td className="px-2 py-4 text-center text-amber-500 font-mono">
                      {user.p2RoundScores['CHAMPION']} <span className="text-[10px] text-amber-500/30">/ 25</span>
                    </td>

                    <td className="px-6 py-4 text-right border-l border-slate-800/50 bg-slate-950/30">
                      <span className="font-black text-2xl text-emerald-400 group-hover:text-emerald-300 transition-colors">{user.totalPoints}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">pts</span>
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