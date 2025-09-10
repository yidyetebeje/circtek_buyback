import { NextResponse } from 'next/server';

// This is a simple endpoint to test if the API routes are accessible
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Auth API accessible',
      pathInfo: {
        nextAuthUrl: process.env.NEXTAUTH_URL || 'undefined',
        apiPathAvailable: true,
        timeStamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 