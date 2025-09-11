import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${BACKEND_URL}/api/v1/catalog/languages?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching languages:', error);
    
    // Return fallback languages if backend is unavailable
    const fallbackResponse = {
      data: [
        { id: 1, code: 'en', name: 'English', is_default: 1, is_active: 1 },
        { id: 2, code: 'nl', name: 'Nederlands', is_default: 0, is_active: 1 },
        { id: 3, code: 'fr', name: 'Français', is_default: 0, is_active: 1 },
        { id: 4, code: 'de', name: 'Deutsch', is_default: 0, is_active: 1 }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 4,
        totalPages: 1
      }
    };
    
    return NextResponse.json(fallbackResponse);
  }
} 