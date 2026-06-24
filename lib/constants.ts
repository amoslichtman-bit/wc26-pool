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

// OFFICIALLY CORRECTED 2026 FIXTURES
export const INITIAL_KNOCKOUT_MATCHES = [
  // LEFT SIDE OF BRACKET
  { id: 1, round: 'R32', nextMatchId: 17, slot: 'home', teamA: '1st Place Group E', teamB: '3Q Groups A/B/C/D/F', winner: null }, // Match 74
  { id: 2, round: 'R32', nextMatchId: 17, slot: 'away', teamA: '1st Place Group I', teamB: '3Q Groups C/D/F/G/H', winner: null }, // Match 77
  { id: 3, round: 'R32', nextMatchId: 18, slot: 'home', teamA: '2nd Place Group A', teamB: '2nd Place Group B', winner: null }, // Match 73
  { id: 4, round: 'R32', nextMatchId: 18, slot: 'away', teamA: '1st Place Group F', teamB: '2nd Place Group C', winner: null }, // Match 75
  
  { id: 5, round: 'R32', nextMatchId: 19, slot: 'home', teamA: '1st Place Group C', teamB: '2nd Place Group F', winner: null }, // Match 76
  { id: 6, round: 'R32', nextMatchId: 19, slot: 'away', teamA: '2nd Place Group E', teamB: '2nd Place Group I', winner: null }, // Match 78
  { id: 7, round: 'R32', nextMatchId: 20, slot: 'home', teamA: '1st Place Group A', teamB: '3Q Groups C/E/F/H/I', winner: null }, // Match 79
  { id: 8, round: 'R32', nextMatchId: 20, slot: 'away', teamA: '1st Place Group L', teamB: '3Q Groups E/H/I/J/K', winner: null }, // Match 80
  
  // RIGHT SIDE OF BRACKET
  { id: 9, round: 'R32', nextMatchId: 21, slot: 'home', teamA: '2nd Place Group K', teamB: '2nd Place Group L', winner: null }, // Match 83
  { id: 10, round: 'R32', nextMatchId: 21, slot: 'away', teamA: '1st Place Group H', teamB: '2nd Place Group J', winner: null }, // Match 84
  { id: 11, round: 'R32', nextMatchId: 22, slot: 'home', teamA: '1st Place Group D', teamB: '3Q Groups B/E/F/I/J', winner: null }, // Match 81
  { id: 12, round: 'R32', nextMatchId: 22, slot: 'away', teamA: '1st Place Group G', teamB: '3Q Groups A/E/H/I/J', winner: null }, // Match 82
  
  { id: 13, round: 'R32', nextMatchId: 23, slot: 'home', teamA: '1st Place Group J', teamB: '2nd Place Group H', winner: null }, // Match 86
  { id: 14, round: 'R32', nextMatchId: 23, slot: 'away', teamA: '2nd Place Group D', teamB: '2nd Place Group G', winner: null }, // Match 88
  { id: 15, round: 'R32', nextMatchId: 24, slot: 'home', teamA: '1st Place Group B', teamB: '3Q Groups E/F/G/I/J', winner: null }, // Match 85
  { id: 16, round: 'R32', nextMatchId: 24, slot: 'away', teamA: '1st Place Group K', teamB: '3Q Groups D/E/I/J/L', winner: null }, // Match 87

  // ROUND OF 16
  { id: 17, round: 'R16', nextMatchId: 25, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 89
  { id: 18, round: 'R16', nextMatchId: 25, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 90
  { id: 19, round: 'R16', nextMatchId: 26, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 91
  { id: 20, round: 'R16', nextMatchId: 26, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 92
  
  { id: 21, round: 'R16', nextMatchId: 27, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 93
  { id: 22, round: "R16", nextMatchId: 27, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 94
  { id: 23, round: 'R16', nextMatchId: 28, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 95
  { id: 24, round: 'R16', nextMatchId: 28, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 96

  // QUARTERFINALS
  { id: 25, round: 'QF', nextMatchId: 29, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 97
  { id: 26, round: 'QF', nextMatchId: 29, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 98
  { id: 27, round: 'QF', nextMatchId: 30, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 99
  { id: 28, round: 'QF', nextMatchId: 30, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 100

  // SEMIFINALS
  { id: 29, round: 'SF', nextMatchId: 31, slot: 'home', teamA: '', teamB: '', winner: null }, // Match 101
  { id: 30, round: 'SF', nextMatchId: 31, slot: 'away', teamA: '', teamB: '', winner: null }, // Match 102

  // FINAL
  { id: 31, round: 'F', nextMatchId: null, slot: null, teamA: '', teamB: '', winner: null }, // Match 104
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

// --- FIFA 3RD PLACE MATRIX SOLVER ---

// The 8 official knockout slots that require a 3rd place team.
// Ordered strictly by FIFA's geographic priority logic (Annex C Matrix).
export const THIRD_PLACE_SLOTS = [
  { matchId: 1, allowedGroups: ['C', 'D', 'A', 'F', 'B'] }, // Match 74 (1E)
  { matchId: 2, allowedGroups: ['D', 'F', 'G', 'C', 'H'] }, // Match 77 (1I)
  { matchId: 7, allowedGroups: ['F', 'C', 'E', 'H', 'I'] }, // Match 79 (1A)
  { matchId: 8, allowedGroups: ['K', 'I', 'J', 'E', 'H'] }, // Match 80 (1L)
  { matchId: 11, allowedGroups: ['B', 'I', 'J', 'E', 'F'] }, // Match 81 (1D - USA)
  { matchId: 12, allowedGroups: ['A', 'I', 'J', 'H', 'E'] }, // Match 82 (1G)
  { matchId: 15, allowedGroups: ['G', 'J', 'E', 'F', 'I'] }, // Match 85 (1B)
  { matchId: 16, allowedGroups: ['L', 'D', 'I', 'J', 'E'] }  // Match 87 (1K)
];

// Official FIFA manual overrides for specific advancing group combinations
const FIFA_MATRIX_OVERRIDES: Record<string, Record<number, string>> = {
  "B,C,D,F,G,I,K,L": { 1: "C", 2: "D", 7: "F", 8: "K", 11: "B", 12: "I", 15: "G", 16: "L" },
  "B,C,D,F,G,I,J,L": { 1: "C", 2: "D", 7: "F", 8: "I", 11: "B", 12: "J", 15: "G", 16: "L" },
};

export function assignThirdPlaceTeams(advancingThirds: {team: string, group: string}[]) {
  // Check for a hardcoded override scenario first
  const sortedLetters = advancingThirds.map(t => t.group.replace('GROUP_', '')).sort();
  const combinationKey = sortedLetters.join(',');

  if (FIFA_MATRIX_OVERRIDES[combinationKey]) {
    const override = FIFA_MATRIX_OVERRIDES[combinationKey];
    const result: Record<number, string> = {};
    for (const [matchId, groupLetter] of Object.entries(override)) {
      const teamObj = advancingThirds.find(t => t.group.replace('GROUP_', '') === groupLetter);
      if (teamObj) result[Number(matchId)] = teamObj.team;
    }
    return result;
  }
  
  // Fallback: Run priority cascading backtracking tree solver
  const result: Record<number, string> = {};
  const usedTeams = new Set<string>();

  function backtrack(slotIndex: number): boolean {
    if (slotIndex === THIRD_PLACE_SLOTS.length) return true;

    const currentSlot = THIRD_PLACE_SLOTS[slotIndex];

    for (const groupLetter of currentSlot.allowedGroups) {
      const teamObj = advancingThirds.find(t => t.group.replace('GROUP_', '') === groupLetter);
      
      if (teamObj && !usedTeams.has(teamObj.team)) {
        result[currentSlot.matchId] = teamObj.team;
        usedTeams.add(teamObj.team);

        if (backtrack(slotIndex + 1)) return true;

        delete result[currentSlot.matchId];
        usedTeams.delete(teamObj.team);
      }
    }
    return false; 
  }

  const success = backtrack(0);
  return success ? result : null;
}

// Global Power Rankings (1 = Strongest, 48 = Weakest) used to project unplayed matches
// Global Power Rankings (1 = Strongest, 48 = Weakest) used to project unplayed matches
// Perfectly synchronized to map all 48 active tournament group participants.
export const PRE_TOURNAMENT_RANKS: Record<string, number> = {
  "Argentina": 1, "France": 2, "Spain": 3, "England": 4, "Brazil": 5, 
  "Belgium": 6, "Netherlands": 7, "Portugal": 8, "Germany": 9, "Colombia": 10, 
  "Croatia": 11, "Uruguay": 12, "Morocco": 13, "United States": 14, "Mexico": 15, 
  "Switzerland": 16, "Japan": 17, "Senegal": 18, "Iran": 19, "South Korea": 20, 
  "Australia": 21, "Austria": 22, "Turkey": 23, "Sweden": 24, "Ecuador": 25, 
  "Czechia": 26, "Scotland": 27, "Egypt": 28, "Ivory Coast": 29, "Bosnia & Herzigovina": 30, 
  "Canada": 31, "Tunisia": 32, "Algeria": 33, "Norway": 34, "Paraguay": 35, 
  "Saudi Arabia": 36, "Panama": 37, "Uzbekistan": 38, "Qatar": 39, "Ghana": 40, 
  "South Africa": 41, "Cape Verde": 42, "DR Congo": 43, "Haiti": 44, "Iraq": 45, 
  "Jordan": 46, "Curacao": 47, "New Zealand": 48
};