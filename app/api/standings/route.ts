import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 
        // Using the secure environment variable instead of the hardcoded string
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
      { error: 'Failed to fetch from external API' }, 
      { status: 500 }
    );
  }
}