// app/api/standings/route.ts

import { NextResponse } from 'next/server';
import { sortStandingsTable, PRE_TOURNAMENT_RANKS, API_TO_COMMON_MAP } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || '' },
      next: { revalidate: 60 } 
    });

    if (!res.ok) return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    const data = await res.json();
    
    const actualGroups: Record<string, any> = {};
    const projGroups: Record<string, any> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    groupLetters.forEach(letter => { 
      actualGroups[`GROUP_${letter}`] = {}; 
      projGroups[`GROUP_${letter}`] = {}; 
    });

    data.matches?.forEach((match: any) => {
      if (match.stage !== 'GROUP_STAGE') return;
      const groupName = match.group; 
      if (!actualGroups[groupName]) return;

      const rawHome = match.homeTeam?.name;
      const rawAway = match.awayTeam?.name;
      if (!rawHome || !rawAway) return;

      const homeTeam = API_TO_COMMON_MAP[rawHome] || rawHome;
      const awayTeam = API_TO_COMMON_MAP[rawAway] || rawAway;

      // Initialize team structures for both actual and projected tables
      if (!actualGroups[groupName][homeTeam]) {
        actualGroups[groupName][homeTeam] = { team: { name: homeTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
        projGroups[groupName][homeTeam] = { team: { name: homeTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }
      if (!actualGroups[groupName][awayTeam]) {
        actualGroups[groupName][awayTeam] = { team: { name: awayTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
        projGroups[groupName][awayTeam] = { team: { name: awayTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }

      const isFinished = match.status === 'FINISHED';
      const isLive = ['IN_PLAY', 'PAUSED'].includes(match.status);
      const isUnplayed = ['SCHEDULED', 'TIMED'].includes(match.status);

      const homeScore = match.score?.fullTime?.home ?? 0;
      const awayScore = match.score?.fullTime?.away ?? 0;

      // --- 1. HANDLE REAL LIVE TABLE (Strict actuals only) ---
      if (isFinished || isLive) {
        actualGroups[groupName][homeTeam].goalsFor += homeScore;
        actualGroups[groupName][awayTeam].goalsFor += awayScore;
        actualGroups[groupName][homeTeam].goalsAgainst += awayScore;
        actualGroups[groupName][awayTeam].goalsAgainst += homeScore;
        actualGroups[groupName][homeTeam].goalDifference += (homeScore - awayScore);
        actualGroups[groupName][awayTeam].goalDifference += (awayScore - homeScore);

        if (isFinished) {
          actualGroups[groupName][homeTeam].playedGames += 1;
          actualGroups[groupName][awayTeam].playedGames += 1;
        if (homeScore > awayScore) { projGroups[groupName][homeTeam].won += 1; projGroups[groupName][homeTeam].points += 3; projGroups[groupName][awayTeam].lost += 1; }
        else if (homeScore < awayScore) { projGroups[groupName][awayTeam].won += 1; projGroups[groupName][awayTeam].points += 3; projGroups[groupName][homeTeam].lost += 1; }
        else { projGroups[groupName][homeTeam].draw += 1; projGroups[groupName][awayTeam].draw += 1; projGroups[groupName][homeTeam].points += 1; projGroups[groupName][awayTeam].points += 1; }
       }
      }

      // --- 2. HANDLE CHALK PROJECTED TABLE (Real completed games + Chalk simulated future games) ---
      if (isFinished) {
        // Apply finished real game exacts to projection
        projGroups[groupName][homeTeam].playedGames += 1; projGroups[groupName][awayTeam].playedGames += 1;
        projGroups[groupName][homeTeam].goalsFor += homeScore; projGroups[groupName][awayTeam].goalsFor += awayScore;
        projGroups[groupName][homeTeam].goalsAgainst += awayScore; projGroups[groupName][awayTeam].goalsAgainst += homeScore;
        projGroups[groupName][homeTeam].goalDifference += (homeScore - awayScore); projGroups[groupName][awayTeam].goalDifference += (awayScore - homeScore);
        
        if (homeScore > awayScore) { projGroups[groupName][homeTeam].won += 1; projGroups[groupName][homeTeam].points += 3; projGroups[groupName][awayTeam].lost += 1; }
        else if (homeScore < awayScore) { projGroups[groupName][awayTeam].won += 1; projGroups[groupName][awayTeam].points += 3; projGroups[groupName][homeTeam].lost += 1; }
        else { projGroups[groupName][homeTeam].draw += 1; projGroups[groupName][awayTeam].draw += 1; projGroups[groupName][homeTeam].points += 1; projGroups[groupName][awayTeam].points += 1; }
      } else if (isUnplayed || isLive) {
        // For remaining unplayed games, apply a standard simulated 2-1 victory for the higher ranked team
        const rankHome = PRE_TOURNAMENT_RANKS[homeTeam] || 50;
        const rankAway = PRE_TOURNAMENT_RANKS[awayTeam] || 50;
        const isHomeStronger = rankHome < rankAway;

        projGroups[groupName][homeTeam].playedGames += 1; projGroups[groupName][awayTeam].playedGames += 1;
        
        if (isHomeStronger) {
          projGroups[groupName][homeTeam].won += 1; projGroups[groupName][homeTeam].points += 3; projGroups[groupName][awayTeam].lost += 1;
          projGroups[groupName][homeTeam].goalsFor += 2; projGroups[groupName][homeTeam].goalsAgainst += 1; projGroups[groupName][homeTeam].goalDifference += 1;
          projGroups[groupName][awayTeam].goalsFor += 1; projGroups[groupName][awayTeam].goalsAgainst += 2; projGroups[groupName][awayTeam].goalDifference -= 1;
        } else {
          projGroups[groupName][awayTeam].won += 1; projGroups[groupName][awayTeam].points += 3; projGroups[groupName][homeTeam].lost += 1;
          projGroups[groupName][awayTeam].goalsFor += 2; projGroups[groupName][awayTeam].goalsAgainst += 1; projGroups[groupName][awayTeam].goalDifference += 1;
          projGroups[groupName][homeTeam].goalsFor += 1; projGroups[groupName][homeTeam].goalsAgainst += 2; projGroups[groupName][homeTeam].goalDifference -= 1;
        }
      }
    });

    const standings = Object.keys(actualGroups).map(groupName => ({ type: 'TOTAL', group: groupName, table: Object.values(actualGroups[groupName]).sort(sortStandingsTable) }));
    const projectedStandings = Object.keys(projGroups).map(groupName => ({ type: 'TOTAL', group: groupName, table: Object.values(projGroups[groupName]).sort(sortStandingsTable) }));

    return NextResponse.json({ standings, projectedStandings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate standings' }, { status: 500 });
  }
}