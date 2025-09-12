import { NextRequest, NextResponse } from 'next/server';

// Use the same backend URL as other API routes
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // get the bearer token from the request
    const bearerToken = request.headers.get('Authorization');
    const token = bearerToken?.split(' ')[1];
    
    const response = await fetch(`${BACKEND_URL}/catalog/ai-translation/component`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error ${response.status}:`, errorText);
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Translation API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'AI translation failed' 
      },
      { status: 500 }
    );
  }
} 