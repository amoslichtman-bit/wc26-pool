import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 'X-Auth-Token': 'dfb03242a8034f3eacc6a01d89e1fe23' },
      // Fetch fresh data, but cache it for 60 seconds to automatically prevent rate-limiting
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