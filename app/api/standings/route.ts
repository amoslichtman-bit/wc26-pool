import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all raw matches instead of pre-calculated standings
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || '' },
      next: { revalidate: 60 } 
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API responded with status: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    
    // Build an empty dictionary for 12 groups
    const groups: Record<string, any> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    groupLetters.forEach(letter => { groups[`GROUP_${letter}`] = {}; });

    // Calculate table dynamically
    data.matches?.forEach((match: any) => {
      if (match.stage !== 'GROUP_STAGE') return;
      const groupName = match.group; 
      if (!groups[groupName]) return;

      const homeTeam = match.homeTeam?.name;
      const awayTeam = match.awayTeam?.name;
      if (!homeTeam || !awayTeam) return;

      // Initialize teams if they haven't been added yet
      if (!groups[groupName][homeTeam]) {
        groups[groupName][homeTeam] = { team: { name: homeTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }
      if (!groups[groupName][awayTeam]) {
        groups[groupName][awayTeam] = { team: { name: awayTeam }, playedGames: 0, won: 0, draw: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      }

      // ONLY calculate points if the match is completely finished
      if (match.status === 'FINISHED') {
        const homeScore = match.score?.fullTime?.home ?? 0;
        const awayScore = match.score?.fullTime?.away ?? 0;

        groups[groupName][homeTeam].playedGames += 1;
        groups[groupName][awayTeam].playedGames += 1;
        groups[groupName][homeTeam].goalsFor += homeScore;
        groups[groupName][awayTeam].goalsFor += awayScore;
        groups[groupName][homeTeam].goalsAgainst += awayScore;
        groups[groupName][awayTeam].goalsAgainst += homeScore;
        groups[groupName][homeTeam].goalDifference += (homeScore - awayScore);
        groups[groupName][awayTeam].goalDifference += (awayScore - homeScore);

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
    });

    // Format output to exactly match what your frontend/leaderboard already expects
    const standings = Object.keys(groups).map(groupName => {
      const table = Object.values(groups[groupName]).sort((a: any, b: any) => {
         if (b.points !== a.points) return b.points - a.points;
         if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
         if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor; // WC Official Tiebreaker 3
         return 0;
      });
      return { type: 'TOTAL', group: groupName, table };
    });

    return NextResponse.json({ standings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate standings' }, { status: 500 });
  }
}