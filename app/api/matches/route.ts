import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Removed ?stage=LAST_32 so we fetch the entire tournament
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 
        'X-Auth-Token': process.env.FOOTBALL_API_KEY || '' 
      },
      next: { revalidate: 60 } 
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Football API responded with status: ${res.status}` }, 
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Server API Error:", error);
    return NextResponse.json(
      { error: 'Failed to fetch matches from external API' }, 
      { status: 500 }
    );
  }
}