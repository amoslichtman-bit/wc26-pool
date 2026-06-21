// app/api/standings/route.ts

import { NextResponse } from 'next/server';
import { sortStandingsTable } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || '' },
      next: { revalidate: 60 } 
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API responded with status: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    
    const groups: Record<string, any> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    groupLetters.forEach(letter => { groups[`GROUP_${letter}`] = {}; });

    data.matches?.forEach((match: any) => {
      if (match.stage !== 'GROUP_STAGE') return;
      const groupName = match.group; 
      if (!groups[groupName]) return;

      const homeTeam = match.homeTeam?.name;
      const awayTeam = match.awayTeam?.name;
      if (!homeTeam || !awayTeam) return;

      if (!groups[groupName][homeTeam]) {
        groups[groupName][homeTeam] = { team: { name: homeTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }
      if (!groups[groupName][awayTeam]) {
        groups[groupName][awayTeam] = { team: { name: awayTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }

      const isLive = ['IN_PLAY', 'PAUSED'].includes(match.status);
      const isFinished = match.status === 'FINISHED';

      // If the game is currently happening OR has ended, track the goals
      if (isFinished || isLive) {
        const homeScore = match.score?.fullTime?.home ?? 0;
        const awayScore = match.score?.fullTime?.away ?? 0;

        groups[groupName][homeTeam].goalsFor += homeScore;
        groups[groupName][awayTeam].goalsFor += awayScore;
        groups[groupName][homeTeam].goalsAgainst += awayScore;
        groups[groupName][awayTeam].goalsAgainst += homeScore;
        groups[groupName][homeTeam].goalDifference += (homeScore - awayScore);
        groups[groupName][awayTeam].goalDifference += (awayScore - homeScore);

        // BUT ONLY award points and wins if the game is completely over
        if (isFinished) {
          groups[groupName][homeTeam].playedGames += 1;
          groups[groupName][awayTeam].playedGames += 1;

          if (homeScore > awayScore) {
            groups[groupName][homeTeam].won += 1;
            groups[groupName][homeTeam].points += 3;
            groups[groupName][awayTeam].lost += 1;
          } else if (homeScore < awayScore) {
            groups[groupName][awayTeam].won += 1;
            groups[groupName][awayTeam].points += 3;
            groups[groupName][homeTeam].lost += 1;
          } else {
            groups[groupName][homeTeam].draw += 1;
            groups[groupName][awayTeam].draw += 1;
            groups[groupName][homeTeam].points += 1;
            groups[groupName][awayTeam].points += 1;
          }
        }
      }
    });

    const standings = Object.keys(groups).map(groupName => {
      const table = Object.values(groups[groupName]).sort(sortStandingsTable);
      return { type: 'TOTAL', group: groupName, table };
    });

    return NextResponse.json({ standings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate standings' }, { status: 500 });
  }
}