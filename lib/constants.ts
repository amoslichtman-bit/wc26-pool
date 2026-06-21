// lib/constants.ts

export const API_TO_COMMON_MAP: Record<string, string> = { 
  "United States": "United States", 
  "USA": "United States", 
  "Bosnia and Herzegovina": "Bosnia & Herzigovina", 
  "Bosnia-Herzegovina": "Bosnia & Herzigovina", 
  "Czech Republic": "Czechia", 
  "Korea Republic": "South Korea", 
  "Congo DR": "DR Congo", 
  "Côte d'Ivoire": "Ivory Coast", 
  "Cabo Verde": "Cape Verde", 
  "Cape Verde Islands": "Cape Verde", 
  "Curaçao": "Curacao" 
};

export const INITIAL_KNOCKOUT_MATCHES = [
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
  { id: 22, round: "R16", nextMatchId: 27, slot: 'away', teamA: '', teamB: '', winner: null },
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

export const TOURNAMENT_GROUPS = [
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

export function sortStandingsTable(a: any, b: any) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return 0;
}